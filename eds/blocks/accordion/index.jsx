// Radix Primitives reference for the accordion block. The EDS version in accordion.js follows the same
// data-state contract, so accordion.css styles both.
import * as Accordion from '@radix-ui/react-accordion';

export default function AccordionBlock({ items }) {
  return (
    <Accordion.Root type="single" collapsible className="accordion">
      {items.map(({ label, body }) => (
        <Accordion.Item key={label} value={label} className="accordion-item">
          <Accordion.Header>
            <Accordion.Trigger className="accordion-trigger">{label}</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="accordion-content">{body}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
