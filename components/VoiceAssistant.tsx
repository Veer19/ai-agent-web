"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WaveForm from "./WaveForm";

const VoiceAssistant = () => {
	const [pastConversations, setPastConversations] = useState<
		{ question: string; answer: string }[]
	>([]);
	const [isRecording, setIsRecording] = useState(false);
	const [waveformData, setWaveformData] = useState<number[]>(
		Array(20).fill(3)
	);
	const [isLoading, setIsLoading] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);

	// Audio recording references
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

	// Initialize audio context and speech synthesis
	useEffect(() => {
		if (typeof window !== "undefined") {
			audioContextRef.current = new (window.AudioContext ||
				(window as any).webkitAudioContext)();
		}

		// Initialize speech synthesis
		speechSynthesisRef.current = new SpeechSynthesisUtterance();

		// Handle speech synthesis events
		speechSynthesisRef.current.onstart = () => {
			setIsSpeaking(true);
			animateSpeakerWaveform();
		};

		speechSynthesisRef.current.onend = () => {
			setIsSpeaking(false);
			clearWaveformAnimation();
		};

		return () => {
			if (speechSynthesis.speaking) {
				speechSynthesis.cancel();
			}
		};
	}, []);

	// Start recording function
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});

			// Set up audio analyzer for waveform visualization
			if (audioContextRef.current) {
				const source =
					audioContextRef.current.createMediaStreamSource(stream);
				analyserRef.current = audioContextRef.current.createAnalyser();
				analyserRef.current.fftSize = 256;
				source.connect(analyserRef.current);

				// Start waveform visualization
				visualizeAudio();
			}

			// Set up media recorder
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.start();
			setIsRecording(true);
		} catch (error) {
			console.error("Error accessing microphone:", error);
		}
	};

	// Stop recording and send audio to API
	const stopRecording = async () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();

			// Wait for the final data to be available
			mediaRecorderRef.current.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});

				// Convert blob to base64
				const reader = new FileReader();
				reader.readAsDataURL(audioBlob);
				reader.onloadend = async () => {
					const base64Audio = reader.result?.toString().split(",")[1];

					if (base64Audio) {
						// Show loading state
						setIsLoading(true);

						try {
							// Send audio to API
							const response = await fetch(
								"http://localhost:8000/ask-audio",
								{
									method: "POST",
									headers: {
										"Content-Type": "application/json",
									},
									body: JSON.stringify({
										audio_data: base64Audio,
										past_conversations: pastConversations,
									}),
								}
							);

							if (!response.ok) {
								throw new Error("API request failed");
							}

							const data = await response.json();

							// Set AI response
							setIsLoading(false);
							setPastConversations((prev) => {
								return [
									...prev,
									{
										question: data.question,
										answer: data.answer,
									},
								];
							});

							// Speak the response
							if (speechSynthesisRef.current) {
								speechSynthesisRef.current.text = data.answer;
								speechSynthesis.speak(
									speechSynthesisRef.current
								);
							}
						} catch (error) {
							console.error("Error sending audio to API:", error);
							setIsLoading(false);
						}
					}
				};
			};

			setIsRecording(false);
			clearWaveformAnimation();

			// Stop all tracks in the stream
			if (mediaRecorderRef.current.stream) {
				mediaRecorderRef.current.stream
					.getTracks()
					.forEach((track) => track.stop());
			}
		}
	};

	// Toggle recording state
	const toggleRecording = () => {
		if (!isRecording) {
			startRecording();
		} else {
			stopRecording();
		}
	};

	// Visualize audio for waveform
	const visualizeAudio = () => {
		if (!analyserRef.current) return;

		const bufferLength = analyserRef.current.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const updateWaveform = () => {
			if (!isRecording || !analyserRef.current) return;

			analyserRef.current.getByteFrequencyData(dataArray);

			// Use frequency data to update waveform
			const waveformValues = Array.from({ length: 20 }, (_, i) => {
				const index = Math.floor(i * (bufferLength / 20));
				// Scale the value to a reasonable height (1-20px)
				return Math.max(1, Math.min(20, dataArray[index] / 12));
			});

			setWaveformData(waveformValues);
			requestAnimationFrame(updateWaveform);
		};

		updateWaveform();
	};

	// Animate speaker waveform
	const animateSpeakerWaveform = () => {
		// Update waveform data for speaking animation
		const interval = setInterval(() => {
			setWaveformData((prevData) => {
				return prevData.map(() => Math.floor(Math.random() * 15) + 5);
			});
		}, 100);

		return () => clearInterval(interval);
	};

	// Clear waveform animation
	const clearWaveformAnimation = () => {
		// Reset waveform data when not active
		setWaveformData(Array(20).fill(3));
	};

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-6 p-4 rounded-xl shadow-sm transition-all duration-300 h-[100vh] bg-white/50 dark:bg-slate-800/50"
			)}
		>
			{/* Recording button */}
			<Button
				onClick={isSpeaking ? () => {} : toggleRecording}
				className={cn(
					"h-64 w-64 rounded-full transition-all duration-300 shadow-lg",
					isRecording
						? "bg-red-500 hover:bg-red-600 animate-pulse"
						: isSpeaking
						? "bg-blue-500 hover:bg-blue-600 animate-pulse"
						: "bg-black hover:bg-black/90"
				)}
				disabled={isLoading}
			>
				{isRecording ? (
					<MicOff className="text-white" />
				) : isSpeaking ? (
					<Volume2 className="text-white" />
				) : (
					<Mic className="text-white" />
				)}
			</Button>

			{/* Waveform visualization */}
			<WaveForm
				waveformData={waveformData}
				isRecording={isRecording}
				isSpeaking={isSpeaking}
			/>

			<p className="text-3xl text-muted-foreground text-center">
				{isRecording
					? "Listening..."
					: isLoading
					? "Processing..."
					: isSpeaking
					? "Speaking..."
					: "Tap the microphone to start"}
			</p>
		</div>
	);
};

export default VoiceAssistant;
