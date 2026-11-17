// Radix Themes reference for the stats block. The EDS version in stats.js builds the same
// description list, so stats.css styles both.
import { Heading, Text } from '@radix-ui/themes';

export default function StatsBlock({ items }) {
  return (
    <div className="stats">
      <dl>
        {items.map(({ value, label }) => (
          <div key={label}>
            <dd><Heading as="span" size="8">{value}</Heading></dd>
            <dt><Text color="gray" size="3">{label}</Text></dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
