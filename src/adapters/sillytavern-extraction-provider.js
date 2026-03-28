export function createSillyTavernExtractionProvider({ generateQuietPrompt }) {
    return {
        async extract({ prompt, context }) {
            if (typeof generateQuietPrompt !== 'function') {
                return {
                    ok: false,
                    stage: 'model-call',
                    reason: 'generate-quiet-prompt-unavailable',
                    details: context,
                };
            }

            try {
                const rawText = await generateQuietPrompt({
                    quietPrompt: prompt,
                    trimToSentence: false,
                });

                return {
                    ok: true,
                    rawText: typeof rawText === 'string' ? rawText : JSON.stringify(rawText ?? ''),
                };
            } catch (error) {
                return {
                    ok: false,
                    stage: 'model-call',
                    reason: 'provider-call-failed',
                    details: {
                        ...context,
                        message: error instanceof Error ? error.message : String(error),
                    },
                };
            }
        },
    };
}
