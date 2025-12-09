interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export default function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="border-b border-[var(--border)] pb-5 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 text-[var(--icon-muted)] mx-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-[var(--foreground)]">{title}</h1>
          {description && (
            <p className="mt-2 max-w-4xl text-sm text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center space-x-3">{action}</div>}
      </div>
    </div>
  );
}
