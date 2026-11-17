// Radix Themes reference for the quote block. The EDS version in quote.js produces the same
// blockquote and cite, so quote.css styles both.
import { Blockquote, Text } from '@radix-ui/themes';

export default function QuoteBlock({ quote, attribution }) {
  return (
    <div className="quote">
      <Blockquote size="6">{quote}</Blockquote>
      <Text as="cite" size="3" color="gray">{attribution}</Text>
    </div>
  );
}
