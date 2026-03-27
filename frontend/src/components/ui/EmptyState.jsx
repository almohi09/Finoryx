import Button from "./Button";

const EmptyState = ({ icon, title, description, action, actionLabel }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="text-5xl mb-4 opacity-40">{icon}</div>
      )}
      <h3 className="section-title mb-2">{title}</h3>
      {description && (
        <p className="muted-text text-sm max-w-xs mb-5">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </div>
  );
};

export default EmptyState;
