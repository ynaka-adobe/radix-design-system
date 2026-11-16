import { Flex, Text, Select, TextField } from '@radix-ui/themes';

export function Field({ label, children }) {
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">{label}</Text>
      {children}
    </Flex>
  );
}

export function Pick({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <Select.Root value={value} onValueChange={onChange} size="2">
        <Select.Trigger />
        <Select.Content>
          {options.map((o) => <Select.Item key={o} value={o}>{o}</Select.Item>)}
        </Select.Content>
      </Select.Root>
    </Field>
  );
}

export function Text1({ label, value, onChange, placeholder }) {
  return (
    <Field label={label}>
      <TextField.Root value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} size="2" />
    </Field>
  );
}
