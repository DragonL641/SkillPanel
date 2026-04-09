interface Summary {
  customTotal: number;
  customEnabled: number;
  pluginTotal: number;
  grandTotal: number;
}

export default function SummaryBar({ data }: { data: Summary | null }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 px-4 py-2 text-sm text-gray-600">
      {data ? (
        <div className="flex items-center gap-6">
          <span>
            自定义: {data.customTotal} (已启用 {data.customEnabled})
          </span>
          <span>插件: {data.pluginTotal}</span>
          <span>总计: {data.grandTotal}</span>
        </div>
      ) : (
        <span>加载中...</span>
      )}
    </div>
  );
}
