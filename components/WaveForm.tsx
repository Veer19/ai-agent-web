import { cn } from "@/lib/utils";
import React from "react";

const WaveForm = ({
	waveformData,
	isRecording,
	isSpeaking,
}: {
	waveformData: number[];
	isRecording: boolean;
	isSpeaking: boolean;
}) => {
	return (
		<div className="w-full h-20 flex items-center justify-center">
			<div className="flex items-center justify-center w-full h-full gap-1">
				{waveformData.map((height, index) => (
					<div
						key={index}
						className={cn(
							"w-1 rounded-full transition-all duration-100",
							isRecording
								? "bg-primary"
								: isSpeaking
								? "bg-blue-500"
								: "bg-gray-300 dark:bg-gray-700"
						)}
						style={{
							height: `${height}px`,
							opacity: isRecording || isSpeaking ? 1 : 0.5,
							transform: `scaleY(${
								isRecording || isSpeaking ? height / 10 : 0.3
							})`,
						}}
					/>
				))}
			</div>
		</div>
	);
};

export default WaveForm;
