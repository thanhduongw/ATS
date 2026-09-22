import { HelperText, TextInput } from "react-native-paper";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import type { ComponentProps } from "react";
import { SPACING } from "@/theme";

type PaperInputProps = Omit<
  ComponentProps<typeof TextInput>,
  "value" | "onChangeText" | "onBlur" | "error" | "label" | "mode"
>;

interface Props<T extends FieldValues> extends PaperInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
  message?: string;
}

/**
 * Ô nhập dùng chung cho mọi form: nối react-hook-form với TextInput của Paper và
 * chỗ hiện lỗi bên dưới. Web đặt nhãn phía trên ô (Form layout="vertical") — Paper dùng
 * nhãn nổi, đó là chuẩn Material trên mobile và vẫn giữ nguyên màu/bo góc của web.
 *
 * Quy ước 5 trong CLAUDE.md: form KHÔNG dùng useState cho giá trị.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  message,
  ...inputProps
}: Props<T>) {
  const hasError = !!message;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <>
          <TextInput
            {...inputProps}
            label={label}
            mode="outlined"
            value={typeof value === "string" ? value : ""}
            onBlur={onBlur}
            onChangeText={onChange}
            error={hasError}
            style={[{ marginTop: SPACING.xs }, inputProps.style]}
          />
          <HelperText type="error" visible={hasError}>
            {message}
          </HelperText>
        </>
      )}
    />
  );
}
