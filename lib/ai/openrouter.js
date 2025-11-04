// OpenRouter Vision Adapter
// Provides a minimal wrapper around OpenRouter's OpenAI-compatible chat completions API

export async function generateVisionViaOpenRouter({
	modelId,
	imageBase64,
	mimeType = 'image/jpeg',
	prompt,
	temperature = 0.2,
	top_p,
	timeoutMs = 30000,
	stop,
	contentOrder, // 'image-first' | 'text-first'
}) {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw new Error('Missing OPENROUTER_API_KEY');
	}

	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
				'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://localhost',
				'X-Title': process.env.OPENROUTER_APP_NAME || 'ai-finance-platform',
			},
			body: JSON.stringify({
				model: modelId,
				temperature,
				top_p,
				stop,
				messages: [
					{
						role: 'user',
						content: contentOrder === 'image-first'
							? [
								{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
								{ type: 'text', text: prompt },
							]
							: [
								{ type: 'text', text: prompt },
								{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
							],
					},
				],
				response_format: { type: 'text' },
			}),
			signal: controller.signal,
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => '');
			throw new Error(`OpenRouter error ${res.status}: ${errText}`);
		}

		const data = await res.json();
		const choice = data?.choices?.[0];
		const text = choice?.message?.content || '';
		if (!text) {
			console.warn('[OpenRouter] empty content from model', modelId, JSON.stringify(data).slice(0, 400));
		}
		return { text, raw: data, model: modelId };
	} finally {
		clearTimeout(id);
	}
}



