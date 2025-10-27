export default function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-200">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-48" />
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}