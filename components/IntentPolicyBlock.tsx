'use client';

import React from 'react';
import type { IntentInfo, ContextPolicyV170, ContextExecutionState } from '@/types/chat_v1_7_0';
import { getSkipReasonText } from '@/types/chat_v1_7_0';

type IntentPolicyBlockProps = {
  intent?: IntentInfo;
  contextPolicy?: ContextPolicyV170;
  contextExecution?: ContextExecutionState;
  skipReason?: 'intent_policy' | 'policy_config' | 'fallback';
};

const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'gray' | 'green' | 'red' | 'amber' | 'blue';
}> = ({ children, tone = 'gray' }) => {
  const cls =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-800'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : tone === 'blue'
            ? 'border-sky-200 bg-sky-50 text-sky-800'
            : 'border-gray-200 bg-gray-50 text-gray-800';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        cls,
      ].join(' ')}
    >
      {children}
    </span>
  );
};

const SectionLabel: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{title}</div>
);

const FieldRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 text-xs text-gray-700 rounded-lg">
    <div className="text-gray-500 whitespace-nowrap">{label}</div>
    <div className="text-right font-mono break-all text-gray-900 flex-1">{value ?? '—'}</div>
  </div>
);

/**
 * Intent & Policy 区块（v1.7.0 新增）
 * 展示意图识别和策略决策信息
 */
export const IntentPolicyBlock: React.FC<IntentPolicyBlockProps> = ({
  intent,
  contextPolicy,
  contextExecution,
  skipReason,
}) => {
  // 处理 Intent 缺失（降级规则 1）
  if (!intent) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
        Intent not reported (legacy graph)
      </div>
    );
  }

  // 处理 Policy 缺失（降级规则 2）
  if (intent && !contextPolicy) {
    return (
      <div className="space-y-2">
        <FieldRow
          label="Intent"
          value={
            <div className="flex items-center gap-2">
              <span className="font-mono">{intent.name}</span>
              {intent.confidence !== undefined && (
                <Pill tone="gray">{(intent.confidence * 100).toFixed(0)}%</Pill>
              )}
            </div>
          }
        />
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
          Policy resolution unavailable
        </div>
      </div>
    );
  }

  // 正常情况：Intent 和 Policy 都存在
  const policy = contextPolicy; // TS narrowing helper
  if (!policy) return null;

  const useContext = policy.use_context;
  const policySource = policy.source;
  const executionState = contextExecution;

  return (
    <div className="space-y-3">
      {/* Intent 行 */}
      <div>
        <SectionLabel title="Intent" />
        <FieldRow
          label="Name"
          value={
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-900">{intent.name}</span>
              {intent.confidence !== undefined && (
                <Pill tone="gray">{(intent.confidence * 100).toFixed(0)}%</Pill>
              )}
            </div>
          }
        />
        {intent.reasoning && (
          <FieldRow label="Reasoning" value={<span className="text-gray-700">{intent.reasoning}</span>} />
        )}
        {intent.model_used && (
          <FieldRow
            label="Model"
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-700">{intent.model_used}</span>
                {intent.fallback && <Pill tone="amber">fallback</Pill>}
              </div>
            }
          />
        )}
      </div>

      {/* Policy 行 */}
      <div>
        <SectionLabel title="Policy" />
        <div className="space-y-1">
          <FieldRow
            label="use_context"
            value={
              useContext ? (
                <Pill tone="green">enabled</Pill>
              ) : (
                <Pill tone="red">Skip Context</Pill>
              )
            }
          />
          {policy.recall_enabled !== undefined && (
            <FieldRow
              label="recall_enabled"
              value={
                policy.recall_enabled ? (
                  <Pill tone="green">ON</Pill>
                ) : (
                  <Pill tone="red">OFF</Pill>
                )
              }
            />
          )}
          {policy.rerank_enabled !== undefined && (
            <FieldRow
              label="rerank_enabled"
              value={
                policy.rerank_enabled ? (
                  <Pill tone="green">ON</Pill>
                ) : (
                  <Pill tone="red">OFF</Pill>
                )
              }
            />
          )}
          {policy.write_memory !== undefined && (
            <FieldRow
              label="write_memory"
              value={
                policy.write_memory ? (
                  <Pill tone="green">ON</Pill>
                ) : (
                  <Pill tone="red">OFF</Pill>
                )
              }
            />
          )}
          <FieldRow label="source" value={<Pill tone="gray">{policySource}</Pill>} />
        </div>
      </div>

      {/* Execution 结论 */}
      {executionState && (
        <div>
          <SectionLabel title="Execution" />
          {executionState === 'skipped' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
              <div className="font-semibold mb-1">🚫 Context Skipped by Policy</div>
              <div>{getSkipReasonText(skipReason)}</div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-700">
              <div className="font-semibold">✅ Context Applied</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
