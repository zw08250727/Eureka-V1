import type { ReactNode, UIEventHandler } from "react";
export interface Column<T> {
  key: string;
  title: string;
  render: (row: T) => ReactNode;
}
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  label,
  onScroll,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  label: string;
  onScroll?: UIEventHandler<HTMLDivElement>;
  footer?: ReactNode;
}) {
  return (
    <div
      className="ui-table-scroll"
      onScroll={onScroll}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="ui-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="table-empty" role="status">
          没有符合条件的会议，请调整筛选条件。
        </p>
      ) : null}
      {footer}
    </div>
  );
}
