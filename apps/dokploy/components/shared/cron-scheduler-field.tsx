import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useMemo } from "react";
import type { ControllerRenderProps } from "react-hook-form";
import {
	FormControl,
	FormDescription,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { commonCronExpressions } from "../dashboard/application/schedules/handle-schedules";

const CUSTOM_VALUE = "__CUSTOM__";

interface CronSchedulerFieldProps {
	field: ControllerRenderProps<any, string>;
	label?: string;
	description?: string;
}

export const CronSchedulerField = ({
	field,
	label = "Schedule",
	description = "Choose a predefined schedule or enter a custom cron expression",
}: CronSchedulerFieldProps) => {
	// Find the matching preset for the current value
	const selectedPreset = useMemo(() => {
		if (!field.value) return CUSTOM_VALUE;
		const matchingPreset = commonCronExpressions.find(
			(expr) => expr.value === field.value,
		);
		return matchingPreset ? matchingPreset.value : CUSTOM_VALUE;
	}, [field.value]);

	const handleSelectChange = (value: string) => {
		if (value === CUSTOM_VALUE) {
			// Don't change the input value when selecting "Custom"
			// The user can continue typing their custom expression
			return;
		}
		// Update the input field with the selected preset value
		field.onChange(value);
	};

	return (
		<FormItem>
			<FormLabel className="flex items-center gap-2">
				{label}
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Info className="w-4 h-4 text-muted-foreground cursor-help" />
						</TooltipTrigger>
						<TooltipContent>
							<p>Cron expression format: minute hour day month weekday</p>
							<p>Example: 0 0 * * * (daily at midnight)</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</FormLabel>
			<div className="flex flex-col gap-2">
				<Select value={selectedPreset} onValueChange={handleSelectChange}>
					<FormControl>
						<SelectTrigger>
							<SelectValue placeholder="Select a predefined schedule" />
						</SelectTrigger>
					</FormControl>
					<SelectContent>
						{commonCronExpressions.map((expr) => (
							<SelectItem key={expr.value} value={expr.value}>
								{expr.label} ({expr.value})
							</SelectItem>
						))}
						<SelectItem value={CUSTOM_VALUE}>Custom</SelectItem>
					</SelectContent>
				</Select>
				<div className="relative">
					<FormControl>
						<Input
							placeholder="Custom cron expression (e.g., 0 0 * * *)"
							{...field}
						/>
					</FormControl>
				</div>
			</div>
			<FormDescription>{description}</FormDescription>
			<FormMessage />
		</FormItem>
	);
};

