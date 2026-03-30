const mongoose = require("mongoose");
const Investment = require("../models/investment.model");
const TradeOrder = require("../models/tradeOrder.model");
const { getAccount, getPositions, getOrderById, submitOrder, searchAssets } = require("../services/alpaca.service");

const toInvestmentResponse = (investment) => ({
  ...investment.toObject(),
  amount: investment.amountInvested,
  purchaseDate: investment.dateOfInvestment,
});

const addInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.create({
      userId: req.user._id,
      name: req.body.name,
      type: req.body.type,
      amountInvested: req.body.amountInvested,
      currentValue: req.body.currentValue,
      dateOfInvestment: req.body.dateOfInvestment || new Date(),
      notes: req.body.notes || "",
    });

    res.status(201).json(toInvestmentResponse(investment));
  } catch (err) {
    next(err);
  }
};

const getInvestments = async (req, res, next) => {
  try {
    const investments = await Investment.find({ userId: req.user._id }).sort({ dateOfInvestment: -1 });
    res.json({ investments: investments.map(toInvestmentResponse) });
  } catch (err) {
    next(err);
  }
};

const updateInvestment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid investment ID" });
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name: req.body.name,
        type: req.body.type,
        amountInvested: req.body.amountInvested,
        currentValue: req.body.currentValue,
        dateOfInvestment: req.body.dateOfInvestment || new Date(),
        notes: req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json(toInvestmentResponse(investment));
  } catch (err) {
    next(err);
  }
};

const deleteInvestment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid investment ID" });
    }

    const deleted = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const toTradeOrderResponse = (order) => ({
  ...order.toObject(),
  executionQuantity: order.filledQty > 0 ? order.filledQty : order.quantity,
  executionPrice: order.filledAvgPrice > 0 ? order.filledAvgPrice : order.price,
  grossValue: (order.filledQty > 0 ? order.filledQty : order.quantity) * (order.filledAvgPrice > 0 ? order.filledAvgPrice : order.price),
  totalValue: ((order.filledQty > 0 ? order.filledQty : order.quantity) * (order.filledAvgPrice > 0 ? order.filledAvgPrice : order.price)) + (order.side === "buy" ? order.fees : -order.fees),
  cashImpact: order.side === "buy"
    ? -((((order.filledQty > 0 ? order.filledQty : order.quantity) * (order.filledAvgPrice > 0 ? order.filledAvgPrice : order.price)) + (order.fees || 0)))
    : ((((order.filledQty > 0 ? order.filledQty : order.quantity) * (order.filledAvgPrice > 0 ? order.filledAvgPrice : order.price)) - (order.fees || 0))),
});

const getTradeOrders = async (req, res, next) => {
  try {
    const orders = await TradeOrder.find({ userId: req.user._id }).sort({ executedAt: -1, createdAt: -1 });
    res.json({ orders: orders.map(toTradeOrderResponse) });
  } catch (err) {
    next(err);
  }
};

const addTradeOrder = async (req, res, next) => {
  try {
    const requestedQuantity = Number(req.body.quantity || 0);
    const requestedPrice = Number(req.body.price || 0);
    const fees = Number(req.body.fees || 0);

    let broker = "manual";
    let platform = req.body.platform || "Paper Trading";
    let brokerOrderId = "";
    let status = "filled";
    let liveExecution = false;
    let filledQty = requestedQuantity;
    let filledAvgPrice = requestedPrice;
    let rawBrokerResponse = null;
    const clientOrderId = `fynvester-${req.user._id}-${Date.now()}`;

    if (req.body.executeLive) {
      const brokerOrder = await submitOrder({
        symbol: req.body.symbol,
        side: req.body.side,
        qty: req.body.quantity,
        type: "market",
        timeInForce: req.body.timeInForce,
        clientOrderId,
      });

      broker = "alpaca";
      platform = "Alpaca";
      brokerOrderId = brokerOrder.id || "";
      status = brokerOrder.status || "accepted";
      liveExecution = true;
      filledQty = Number(brokerOrder.filled_qty || requestedQuantity || 0);
      filledAvgPrice = Number(brokerOrder.filled_avg_price || requestedPrice || 0);

      if (brokerOrderId && (!filledQty || !filledAvgPrice)) {
        try {
          const refreshed = await getOrderById(brokerOrderId);
          filledQty = Number(refreshed.filled_qty || filledQty || requestedQuantity || 0);
          filledAvgPrice = Number(refreshed.filled_avg_price || filledAvgPrice || requestedPrice || 0);
          status = refreshed.status || status;
          rawBrokerResponse = refreshed;
        } catch {
          rawBrokerResponse = brokerOrder;
        }
      } else {
        rawBrokerResponse = brokerOrder;
      }
    }

    const executedQuantity = filledQty > 0 ? filledQty : requestedQuantity;
    const executedPrice = filledAvgPrice > 0 ? filledAvgPrice : requestedPrice;

    const order = await TradeOrder.create({
      userId: req.user._id,
      symbol: req.body.symbol,
      assetName: req.body.assetName,
      assetType: req.body.assetType,
      side: req.body.side,
      quantity: requestedQuantity,
      price: executedPrice,
      fees,
      platform,
      broker,
      brokerOrderId,
      status,
      timeInForce: req.body.timeInForce,
      liveExecution,
      filledQty: executedQuantity,
      filledAvgPrice: executedPrice,
      rawBrokerResponse,
      executedAt: req.body.executedAt || new Date(),
      notes: req.body.notes || "",
    });

    res.status(201).json(toTradeOrderResponse(order));
  } catch (err) {
    next(err);
  }
};

const getTradeSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const [buyTotals, sellTotals] = await Promise.all([
      TradeOrder.aggregate([
        { $match: { userId, side: "buy" } },
        {
          $project: {
            effectiveQty: { $cond: [{ $gt: ["$filledQty", 0] }, "$filledQty", "$quantity"] },
            effectivePrice: { $cond: [{ $gt: ["$filledAvgPrice", 0] }, "$filledAvgPrice", "$price"] },
            fees: "$fees",
          },
        },
        { $group: { _id: null, total: { $sum: { $add: [{ $multiply: ["$effectiveQty", "$effectivePrice"] }, "$fees"] } } } },
      ]),
      TradeOrder.aggregate([
        { $match: { userId, side: "sell" } },
        {
          $project: {
            effectiveQty: { $cond: [{ $gt: ["$filledQty", 0] }, "$filledQty", "$quantity"] },
            effectivePrice: { $cond: [{ $gt: ["$filledAvgPrice", 0] }, "$filledAvgPrice", "$price"] },
            fees: "$fees",
          },
        },
        { $group: { _id: null, total: { $sum: { $subtract: [{ $multiply: ["$effectiveQty", "$effectivePrice"] }, "$fees"] } } } },
      ]),
    ]);

    res.json({
      totalBuys: buyTotals[0]?.total || 0,
      totalSells: sellTotals[0]?.total || 0,
      netTradeFlow: (sellTotals[0]?.total || 0) - (buyTotals[0]?.total || 0),
    });
  } catch (err) {
    next(err);
  }
};

const getBrokerAccount = async (req, res, next) => {
  try {
    const account = await getAccount();
    res.status(200).json({
      broker: "alpaca",
      account: {
        id: account.id,
        status: account.status,
        currency: account.currency,
        buyingPower: Number(account.buying_power || 0),
        equity: Number(account.equity || 0),
        cash: Number(account.cash || 0),
        portfolioValue: Number(account.portfolio_value || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBrokerPositions = async (req, res, next) => {
  try {
    const positions = await getPositions();
    res.status(200).json({
      broker: "alpaca",
      positions: positions.map((item) => ({
        symbol: item.symbol,
        qty: Number(item.qty || 0),
        side: item.side,
        avgEntryPrice: Number(item.avg_entry_price || 0),
        marketValue: Number(item.market_value || 0),
        unrealizedPl: Number(item.unrealized_pl || 0),
        unrealizedPlpc: Number(item.unrealized_plpc || 0),
      })),
    });
  } catch (err) {
    next(err);
  }
};

const searchBrokerAssets = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ assets: [] });
    }

    const limit = Number(req.query.limit || 15);
    const assets = await searchAssets(q, limit);
    return res.status(200).json({ assets });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getTradeOrders,
  addTradeOrder,
  getTradeSummary,
  getBrokerAccount,
  getBrokerPositions,
  searchBrokerAssets,
};
