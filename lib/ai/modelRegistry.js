// Strategy → model configuration mapping (OpenRouter)

export const MODEL_REGISTRY = {
	lightweight: {
		primary: {
			provider: 'openrouter',
			modelId: 'nvidia/nemotron-nano-12b-v2-vl:free',
			params: { temperature: 0.1, timeoutMs: 20000, contentOrder: 'image-first' },
		},
		escalate: [
			{ provider: 'openrouter', modelId: 'google/gemma-3-27b-it:free', params: { temperature: 0.2, timeoutMs: 25000, contentOrder: 'text-first' } },
		],
	},
	standard: {
		primary: {
			provider: 'openrouter',
			modelId: 'qwen/qwen2.5-vl-32b-instruct:free',
			params: { temperature: 0.2, timeoutMs: 25000 },
		},
		escalate: [
			{ provider: 'openrouter', modelId: 'google/gemini-2.0-flash-exp:free', params: { temperature: 0.2, timeoutMs: 30000 } },
		],
	},
	handwriting: {
		primary: {
			provider: 'openrouter',
			modelId: 'google/gemma-3-27b-it:free',
			params: { temperature: 0.35, timeoutMs: 35000 },
		},
		escalate: [
			{ provider: 'openrouter', modelId: 'qwen/qwen2.5-vl-32b-instruct:free', params: { temperature: 0.35, timeoutMs: 40000 } },
		],
	},
	mixed: {
		primary: {
			provider: 'openrouter',
			modelId: 'qwen/qwen2.5-vl-32b-instruct:free',
			params: { temperature: 0.25, timeoutMs: 30000 },
		},
		escalate: [
			{ provider: 'openrouter', modelId: 'google/gemini-2.0-flash-exp:free', params: { temperature: 0.3, timeoutMs: 40000 } },
		],
	},
	batch: {
		primary: {
			provider: 'openrouter',
			modelId: 'qwen/qwen2.5-vl-32b-instruct:free',
			params: { temperature: 0.2, timeoutMs: 35000 },
		},
		escalate: [
			{ provider: 'openrouter', modelId: 'google/gemini-2.0-flash-exp:free', params: { temperature: 0.25, timeoutMs: 45000 } },
		],
	},
	fallback: {
		primary: {
			provider: 'openrouter',
			modelId: 'google/gemini-2.0-flash-exp:free',
			params: { temperature: 0.3, timeoutMs: 45000 },
		},
		escalate: [],
	},
};

export function resolveModelForStrategy(strategy) {
	return MODEL_REGISTRY[strategy] || MODEL_REGISTRY.fallback;
}



