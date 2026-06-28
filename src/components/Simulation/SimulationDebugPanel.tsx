import type { SimulationAgent } from './amoeba/types';

type SimulationDebugPanelProps = {
  agents: SimulationAgent[];
};

const speciesLabels = {
  green: 'green',
  red: 'red',
  black: 'black',
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 52,
        height: 5,
        background: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 999,
        overflow: 'hidden',
        verticalAlign: 'middle',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${Math.max(2, Math.round(value * 100))}%`,
          height: '100%',
          background: color,
        }}
      />
    </span>
  );
}

export default function SimulationDebugPanel({ agents }: SimulationDebugPanelProps) {
  return (
    <aside
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 330,
        maxHeight: 460,
        overflow: 'auto',
        padding: '10px 12px',
        color: '#e5e7eb',
        background: 'rgba(17, 24, 39, 0.84)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        borderRadius: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        lineHeight: 1.45,
        pointerEvents: 'none',
      }}
    >
      <div style={{ marginBottom: 8, color: '#f9fafb', fontWeight: 700 }}>
        agent debug / alive {agents.length}
      </div>

      {agents.map((agent) => (
        <div
          key={agent.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '62px 1fr',
            columnGap: 8,
            rowGap: 2,
            padding: '6px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <span style={{ color: '#f9fafb' }}>{agent.id}</span>
          <span>
            species: {speciesLabels[agent.species]} / intent: {agent.hydrationIntent}
          </span>
          <span>thirst</span>
          <span>
            <Bar value={agent.thirst} color="#38bdf8" /> {formatPercent(agent.thirst)}
          </span>
          <span>full</span>
          <span>
            <Bar value={agent.fullness} color="#fbbf24" /> {formatPercent(agent.fullness)}
          </span>
          <span>pos</span>
          <span>
            x:{agent.position[0].toFixed(1)} z:{agent.position[2].toFixed(1)} age:{agent.age.toFixed(0)}
          </span>
        </div>
      ))}
    </aside>
  );
}
