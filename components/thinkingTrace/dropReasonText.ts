export function dropReasonToText(dropReason?: string | null): string {
  if (!dropReason) return '系统自动取舍';

  switch (dropReason) {
    case 'policy_low':
      return '无关闲聊已自动略过';
    case 'budget_exhausted':
      return '因篇幅限制已折叠';
    case 'token_cap_exceeded':
      return '内容过长已截断';
    default:
      return '系统自动取舍';
  }
}
