// Radix Primitives reference for the tabs block. The EDS version in tabs.js follows the same
// data-state contract, so tabs.css styles both.
import * as Tabs from '@radix-ui/react-tabs';

export default function TabsBlock({ items }) {
  return (
    <Tabs.Root className="tabs" defaultValue={items[0].label}>
      <Tabs.List className="tabs-list">
        {items.map(({ label }) => (
          <Tabs.Trigger key={label} value={label} className="tabs-trigger">{label}</Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map(({ label, body }) => (
        <Tabs.Content key={label} value={label} className="tabs-panel">{body}</Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
