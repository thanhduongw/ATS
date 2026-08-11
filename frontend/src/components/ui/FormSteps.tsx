import { Steps } from "antd";

interface FormStepsProps {
    current: number;
    steps: { title: string; icon?: React.ReactNode }[];
}

/**
 * Thanh tiến trình cho form nhiều bước (Job Posting, Job Requisition...) —
 * theo mẫu Stepper 5 bước trong video tham khảo (mục 4.2 kế hoạch).
 */
export default function FormSteps({ current, steps }: FormStepsProps) {
    return <Steps current={current} items={steps} size="small" style={{ marginBottom: 24 }} />;
}
