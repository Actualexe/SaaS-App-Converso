'use client';

import {useCallback, useEffect, useRef, useState} from 'react'
import {cn, configureAssistant, getSubjectColor} from "@/lib/utils";
import {vapi} from "@/lib/vapi.sdk";
import Image from "next/image";
import { Lottie, type LottieHandle } from 'lottie-react';
import soundwaves from '@/constants/soundwaves.json'
import {addToSessionHistory} from "@/lib/actions/companion.actions";
import type { AssistantOverrides } from '@vapi-ai/web/dist/api';

// Vapi reports errors as { type, error, timestamp } rather than an Error, and
// the console renders that as "{}". Pull out something readable instead.
const describeVapiError = (error: unknown): string => {
    if (!error) return 'Unknown error';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;

    if (typeof error === 'object') {
        const payload = error as { type?: string; error?: { message?: string; errorMsg?: string } | string };
        const inner = typeof payload.error === 'string'
            ? payload.error
            : payload.error?.errorMsg ?? payload.error?.message;

        if (payload.type || inner) return [payload.type, inner].filter(Boolean).join(': ');
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

// When the far end hangs up, the ejection error can arrive before `call-end`,
// so the payload itself has to be recognised as teardown too.
const isTeardownError = (description: string) =>
    /eject|meeting has ended|meeting ended|left the meeting/i.test(description);

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

const CompanionComponent = ({ companionId, subject, topic, name, userName, userImage, style, voice, duration }: CompanionComponentProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState<SavedMessage[]>([]);

    const lottieRef = useRef<LottieHandle>(null);
    // Ending a call ejects us from the Daily room, which surfaces as an `error`
    // event. That is teardown noise, not a failure, so track when we expect it.
    const endingRef = useRef(false);

    useEffect(() => {
        if(isSpeaking) {
            lottieRef.current?.play()
        } else {
            lottieRef.current?.stop()
        }
    }, [isSpeaking])

    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);

        const onCallEnd = () => {
            endingRef.current = true;
            setCallStatus(CallStatus.FINISHED);
            setIsSpeaking(false);
            addToSessionHistory(companionId).catch((error) =>
                console.error('Failed to save session history', error)
            );
        }

        const onMessage = (message: Message) => {
            if(message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage= { role: message.role, content: message.transcript}
                setMessages((prev) => [newMessage, ...prev])
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onError = (error: unknown) => {
            setIsSpeaking(false);

            const description = describeVapiError(error);

            // Expected when a session ends: the room ejects us on the way out.
            if (endingRef.current || isTeardownError(description)) {
                endingRef.current = true;
                console.debug('Vapi teardown notice:', description);
                return;
            }

            console.error('Vapi error:', description);
            setCallStatus(CallStatus.INACTIVE);
        };

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('error', onError);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('error', onError);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
        }
    }, [companionId]);

    // Leaving the page mid-call would otherwise leave the microphone open.
    useEffect(() => () => { vapi.stop() }, []);

    const toggleMicrophone = () => {
        const muted = vapi.isMuted();
        vapi.setMuted(!muted);
        setIsMuted(!muted)
    }

    const handleCall = useCallback(async () => {
        endingRef.current = false;
        setCallStatus(CallStatus.CONNECTING)
        setMessages([])

        const assistantOverrides = {
            variableValues: { subject, topic, style },
            // The SDK's generated types declare these as a single literal,
            // but the API takes an array of message types.
            clientMessages: ["transcript"] as unknown as AssistantOverrides["clientMessages"],
            serverMessages: [] as unknown as AssistantOverrides["serverMessages"],
        } satisfies AssistantOverrides

        try {
            await vapi.start(configureAssistant(voice, style, duration), assistantOverrides)
        } catch (error) {
            console.error('Failed to start the session', error);
            setCallStatus(CallStatus.INACTIVE);
        }
    }, [subject, topic, style, voice, duration])

    const handleDisconnect = () => {
        endingRef.current = true;
        setCallStatus(CallStatus.FINISHED)
        vapi.stop()
    }

    return (
        <section className="flex flex-col h-[70vh]">
            <section className="flex gap-8 max-sm:flex-col">
                <div className="companion-section">
                    <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <div
                            className={
                            cn(
                                'absolute transition-opacity duration-1000', callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE ? 'opacity-100' : 'opacity-0', callStatus === CallStatus.CONNECTING && 'opacity-100 animate-pulse'
                            )
                        }>
                            <Image src={`/icons/${subject}.svg`} alt={subject} width={150} height={150} className="max-sm:w-fit" />
                        </div>

                        <div className={cn('absolute transition-opacity duration-1000', callStatus === CallStatus.ACTIVE ? 'opacity-100': 'opacity-0')}>
                            <Lottie
                                lottieRef={lottieRef}
                                src={soundwaves}
                                autoplay={false}
                                loop
                                className="companion-lottie"
                            />
                        </div>
                    </div>
                    <p className="font-bold text-2xl">{name}</p>
                </div>

                <div className="user-section">
                    <div className="user-avatar">
                        <Image src={userImage} alt={userName} width={130} height={130} className="rounded-lg" />
                        <p className="font-bold text-2xl">
                            {userName}
                        </p>
                    </div>
                    <button className="btn-mic" onClick={toggleMicrophone} disabled={callStatus !== CallStatus.ACTIVE}>
                        <Image src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'} alt="" width={36} height={36} />
                        <p className="max-sm:hidden">
                            {isMuted ? 'Turn on microphone' : 'Turn off microphone'}
                        </p>
                    </button>
                    <button
                        className={cn('rounded-lg py-2 cursor-pointer transition-colors w-full text-white disabled:opacity-70 disabled:cursor-not-allowed', callStatus === CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary', callStatus === CallStatus.CONNECTING && 'animate-pulse')}
                        onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}
                        disabled={callStatus === CallStatus.CONNECTING}
                    >
                        {callStatus === CallStatus.ACTIVE
                        ? "End Session"
                        : callStatus === CallStatus.CONNECTING
                            ? 'Connecting'
                        : 'Start Session'
                        }
                    </button>
                </div>
            </section>

            <section className="transcript">
                <div className="transcript-message no-scrollbar">
                    {messages.map((message, index) => {
                        if(message.role === 'assistant') {
                            return (
                                <p key={index} className="max-sm:text-sm">
                                    {name.split(' ')[0].replace(/[.,]/g, '')}: {message.content}
                                </p>
                            )
                        } else {
                           return <p key={index} className="text-primary max-sm:text-sm">
                                {userName}: {message.content}
                            </p>
                        }
                    })}
                </div>

                <div className="transcript-fade" />
            </section>
        </section>
    )
}

export default CompanionComponent
