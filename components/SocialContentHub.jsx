import React, { useState, useCallback, useMemo } from 'react';
import { supabase } from '../supabase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { trackEvent } from '../analytics.js';
import SocialContentCard, { ANGLE_CONFIG } from './SocialContentCard.jsx';
import LocationStatsPage from './LocationStatsPage.jsx';
import PintPulseReportCard from './PintPulseReportCard.jsx';
import PintOfTheWeekCard from './PintOfTheWeekCard.jsx';
import GuinnessFactCard from './GuinnessFactCard.jsx';


// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

/**
 * Wraps the ai.models.generateContent call with a retry mechanism to handle transient server errors.
 * @param {object} params - The parameters for the generateContent call.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @returns {Promise<GenerateContentResponse>}
 */
const generateContentWithRetry = async (params, maxRetries = 3) => {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await ai.models.generateContent(params);
        } catch (err) {
            attempt++;
            const isRetryable = err.message.includes('503') || err.message.toLowerCase().includes('overloaded') || err.message.toLowerCase().includes('unavailable');
            
            if (isRetryable && attempt < maxRetries) {
                const delay = attempt * 1500; // e.g., 1.5s, 3s
                console.warn(`Attempt ${attempt} failed with a retryable error. Retrying in ${delay / 1000}s...`, err.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`Final attempt failed or error is not retryable.`, err);
                throw err; // Re-throw the error
            }
        }
    }
};


const contentPackageSchema = {
    type: Type.OBJECT,
    properties: {
        content_angle: {
            type: Type.STRING,
            description: "The primary engagement angle for this content. Choose ONE from: 'Aesthetic Excellence', 'Pint Crime', 'Great Value', 'Witty Comment', 'Community Story'."
        },
        content_summary: {
            type: Type.STRING,
            description: "A concise, one-sentence summary explaining WHY this angle was chosen (e.g., 'A visually stunning photo of a perfectly poured pint.')."
        },
        image_quality_score: {
            type: Type.INTEGER,
            description: "A score from 1-10 of the photo's overall quality for social media. Consider focus, lighting, composition, and appeal. 1 is terrible, 10 is perfect."
        },
        pint_visual_score: {
            type: Type.INTEGER,
            description: "A score from 1-10 for the visual quality of the pint of Guinness itself, based on pour standards. 1 is a terrible pour, 10 is a perfect pour. Consider head creaminess, dome, lacing, and glass."
        },
        pint_visual_analysis: {
            type: Type.STRING,
            description: "A brief, 1-2 sentence analysis explaining the pint_visual_score. Mention specific positive or negative visual cues (e.g., 'Excellent dome and lacing', 'Head is too thin')."
        },
        comment_sentiment: {
            type: Type.STRING,
            description: "A one-word sentiment analysis of the user's comment. e.g., 'Positive', 'Enthusiastic', 'Neutral', 'Negative', 'Funny'."
        },
        recommendation: {
            type: Type.STRING,
            description: "A one-word recommendation on whether to feature this content. Choose from 'Priority', 'Good', or 'Skip'."
        },
        image_tags: {
            type: Type.ARRAY,
            description: "A list of 2-5 short, descriptive tags for key visual elements in the photo (e.g., 'perfect dome', 'nice lacing', 'dark background', 'branded glass', 'creamy head').",
            items: { type: Type.STRING }
        },
        comment_themes: {
            type: Type.ARRAY,
            description: "A list of 1-3 keywords or themes from the user's comment (e.g., 'atmosphere', 'price', 'taste', 'friendly staff'). Empty array if no themes.",
            items: { type: Type.STRING }
        },
        suggested_hashtags: {
            type: Type.ARRAY,
            description: "A list of 3-5 relevant and popular hashtags for this post. Include brand, general, and potentially location-specific tags.",
            items: { type: Type.STRING }
        },
        brand_safety_issue: {
            type: Type.BOOLEAN,
            description: "Set to true if the user's comment OR the uploaded image contains any profanity, negativity, nudity, offensive material, or other content that would be unsafe to re-post."
        },
        instagram_post_options: {
            type: Type.ARRAY,
            description: "An array of 3 distinct Instagram post caption options: one witty, one engaging, one descriptive. ALWAYS include user credit (📸: Stoutly user [USERNAME]) and hashtags.",
            items: {
                type: Type.OBJECT,
                properties: {
                    style: { type: Type.STRING, description: "The style of the caption (e.g., 'Witty', 'Engaging Question', 'Descriptive')." },
                    caption_text: { type: Type.STRING, description: "The full text of the caption." }
                },
                required: ["style", "caption_text"]
            }
        },
        story_ideas: {
            type: Type.ARRAY,
            description: "A list of 2-3 creative ideas for an Instagram Story based on the content (e.g., a poll, quiz, or sticker idea). Be concise.",
            items: { type: Type.STRING }
        },
        alternative_post_ideas: {
            type: Type.ARRAY,
            description: "A list of 2-3 different types of post ideas (e.g., 'Turn this into a 'Fun Fact Friday' post', 'Create a 'Spot the Difference' game'). Be concise.",
            items: { type: Type.STRING }
        }
    }
};

const pintOfTheWeekSchema = {
    type: Type.OBJECT,
    properties: {
        winning_contender_index: {
            type: Type.INTEGER,
            description: "The zero-based index (0-4) of the winning rating from the 'Top 5 Contenders' JSON array."
        },
        post_title: {
            type: Type.STRING,
            description: "A short, exciting title for the post, like 'Pint of the Week Winner!'."
        },
        post_caption: {
            type: Type.STRING,
            description: "The complete, ready-to-post Instagram caption. Use newline characters (\\n) for line breaks. It must credit the user and pub. The tone should be celebratory."
        },
        winning_reason: {
            type: Type.STRING,
            description: "A concise, one-sentence explanation for why this pint was chosen as the winner, focusing on its visual appeal."
        },
        story_ideas: {
            type: Type.ARRAY,
            description: "An array of 2-3 creative ideas for Instagram Stories based on this winning pint (e.g., a 'Rate this pour!' poll, a 'Guess the pub' quiz).",
            items: { type: Type.STRING }
        },
    },
    required: ["winning_contender_index", "post_title", "post_caption", "winning_reason", "story_ideas"]
};


const SocialContentHub = ({ onBack, userProfile }) => {
    const [view, setView] = useState('main');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingType, setLoadingType] = useState(null);
    const [error, setError] = useState(null);
    const [potentialContent, setPotentialContent] = useState([]);
    const [strategicReport, setStrategicReport] = useState(null);
    const [guinnessFactPost, setGuinnessFactPost] = useState(null);
    const [filterAngle, setFilterAngle] = useState('all');

    const runAnalysis = useCallback(async (scanType, dbQuery, promptGenerator) => {
        setIsLoading(true);
        setLoadingType(scanType);
        setError(null);
        setPotentialContent([]);
        setStrategicReport(null);
        setGuinnessFactPost(null);
        setFilterAngle('all');
        trackEvent('social_hub_scan_start', { scan_type: scanType });

        try {
            const { data: ratingsToAnalyze, error: dbError } = await dbQuery;
            if (dbError) throw dbError;

            if (ratingsToAnalyze.length === 0) {
                const errorMessage = "No new user posts with photos found in the last 7 days.";
                setError(errorMessage);
                setIsLoading(false);
                setLoadingType(null);
                return;
            }
            
            const ratingIds = ratingsToAnalyze.map(r => r.id);
            const { data: cachedAnalyses, error: cacheError } = await supabase
                .from('rating_ai_analysis')
                .select('rating_id, analysis_data')
                .in('rating_id', ratingIds);
            if (cacheError) throw cacheError;
            
            const cachedMap = new Map((cachedAnalyses || []).map(c => [c.rating_id, c.analysis_data]));
            const contentFromCache = [];
            const contentToScan = [];

            for (const rating of ratingsToAnalyze) {
                if (cachedMap.has(rating.id)) {
                    contentFromCache.push({ ...rating, aiAnalysis: cachedMap.get(rating.id) });
                } else {
                    contentToScan.push(rating);
                }
            }

            const analysisPromises = contentToScan.map(async (rating) => {
                let imagePart = null;
                if (rating.image_url) {
                    try {
                        const response = await fetch(rating.image_url);
                        if (!response.ok) throw new Error('Failed to fetch image');
                        const blob = await response.blob();
                        const reader = new FileReader();
                        const dataUrl = await new Promise(resolve => {
                            reader.onload = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                        const base64Data = dataUrl.split(',')[1];
                        imagePart = { inlineData: { mimeType: blob.type, data: base64Data } };
                    } catch (e) {
                        console.error(`Failed to process image for rating ${rating.id}:`, e);
                    }
                }

                if (!imagePart) {
                    return { ...rating, aiAnalysis: { recommendation: 'Skip', error: 'Image processing failed' } };
                }
                
                const prompt = promptGenerator(rating);
                const contents = { parts: [{ text: prompt }, imagePart] };

                try {
                    const response = await generateContentWithRetry({
                        model: 'gemini-2.5-flash',
                        contents,
                        config: { responseMimeType: 'application/json', responseSchema: contentPackageSchema },
                    });
                    
                    const analysis = JSON.parse(response.text);

                    await supabase.from('rating_ai_analysis').insert({ rating_id: rating.id, analysis_data: analysis });
                    
                    return { ...rating, aiAnalysis: analysis };
                } catch (aiError) {
                     console.error(`Gemini analysis failed for rating ${rating.id}:`, aiError);
                     return { ...rating, aiAnalysis: { recommendation: 'Skip', error: 'Analysis failed' } };
                }
            });

            const newlyAnalyzedContent = await Promise.all(analysisPromises);
            
            const allContent = [...contentFromCache, ...newlyAnalyzedContent].filter(c => c.aiAnalysis.recommendation !== 'Skip');
            
            const sortedContent = allContent.sort((a, b) => {
                const recommendationOrder = { 'Priority': 3, 'Good': 2, 'Skip': 1 };
                const orderA = recommendationOrder[a.aiAnalysis.recommendation] || 0;
                const orderB = recommendationOrder[b.aiAnalysis.recommendation] || 0;
                return orderB - orderA;
            });

            setPotentialContent(sortedContent);
            trackEvent('social_hub_scan_success', { 
                scan_type: scanType,
                total_found: ratingsToAnalyze.length,
                from_cache: contentFromCache.length,
                newly_analyzed: contentToScan.length 
            });

        } catch (err) {
            console.error(`Error scanning for ${scanType}:`, err);
            setError(err.message || 'An unexpected error occurred.');
            trackEvent('social_hub_scan_failed', { scan_type: scanType, error: err.message });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    }, [userProfile]);
    
    const handleScanForTopContent = () => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const query = supabase
            .from('ratings')
            .select('*, user:user_id(id, username, avatar_id), pub:pub_id(id, name, address, country_code, country_name)')
            .gte('created_at', sevenDaysAgo)
            .not('image_url', 'is', null)
            .eq('is_private', false)
            .order('created_at', { ascending: false })
            .limit(10);
            
        const promptGenerator = (rating) => `
            You are 'Stoutly', a witty and expert Social Media Content Strategist for a Guinness rating app. Your tone is friendly, authentic, and celebratory of our community.
            Analyze this user-submitted content and identify the single best engagement angle.

            **Task 1: Identify the Primary Content Angle**
            Analyze the user's photo, ratings, and comment to determine the most compelling angle. Choose ONE: 'Aesthetic Excellence', 'Pint Crime', 'Great Value', 'Witty Comment', 'Community Story'.

            **Task 2: Content Curation Analysis**
            - User: ${rating.user.username} (Quality: ${rating.quality}/5, Price: ${rating.price}/5)
            - Pub: ${rating.pub.name}
            - User's comment: "${rating.message || '(No comment provided.)'}"

            **Task 3: JSON Output**
            Provide a detailed analysis and content ideas in JSON format based on the provided schema.
            INSTRUCTIONS:
            - instagram_post_options: Create three distinct options. ALWAYS include user credit: "📸: Stoutly user ${rating.user.username}". ALWAYS include relevant hashtags. Do NOT use emojis.
        `;
        
        runAnalysis('top_content', query, promptGenerator);
    };

    const handleGeneratePintPulse = async () => {
        setIsLoading(true);
        setLoadingType('pint_pulse');
        setError(null);
        setPotentialContent([]);
        setStrategicReport(null);
        setGuinnessFactPost(null);
        setFilterAngle('all');
        trackEvent('social_hub_scan_start', { scan_type: 'pint_pulse' });

        try {
            const { data: analysisData, error: rpcError } = await supabase.rpc('get_recent_ratings_for_analysis');
            if (rpcError) throw rpcError;
            if (!analysisData || analysisData.length === 0) {
                setError("Not enough recent data to generate a Pint Pulse report.");
                setIsLoading(false);
                setLoadingType(null);
                return;
            }

            const prompt = `
                You are a data analyst and content strategist for 'Stoutly'. Your task is to analyze the following JSON data of the last 50 user ratings and generate a "Weekly Pint Pulse" report. This report should be engaging, insightful, and ready to be used as a basis for social media content.

                **Analysis Data:**
                \`\`\`json
                ${JSON.stringify(analysisData, null, 2)}
                \`\`\`

                **Your Task:**
                Generate a markdown-formatted report with the following sections:
                1.  **Title:** "Weekly Pint Pulse"
                2.  **Overall Vibe:** A one-sentence summary of the general sentiment and quality of pints this week.
                3.  **Top Trends (3-4 bullet points):** Identify interesting patterns. Examples:
                    - "Is there a specific pub getting a lot of attention (good or bad)?"
                    - "Are pint prices trending up or down in a certain city?"
                    - "What are the most common positive (e.g., 'creamy', 'great head') or negative (e.g., 'warm', 'thin') keywords in comments?"
                    - "Consider any visual trends. If many ratings have image URLs, are they generally well-shot or are we seeing a lot of 'pint crimes'?"
                4.  **Hidden Gem:** Identify one specific pub that received a surprisingly high-quality rating but might not be well-known. Mention the pub name and a brief reason.
                5.  **Data-Driven Question for the Community:** Pose one engaging, data-driven question to ask our followers. Example: "We've seen a lot of great ratings from The Liberties this week. Is it Dublin's best value neighborhood for a pint right now? Let us know!"
                6.  **Summary:** A brief concluding sentence.

                Keep the tone insightful, friendly, and data-focused.
            `;

            const response = await generateContentWithRetry({ model: 'gemini-2.5-flash', contents: prompt });

            setStrategicReport({ type: 'pint_pulse', content: response.text });
            trackEvent('social_hub_scan_success', { scan_type: 'pint_pulse' });

        } catch (err) {
            console.error("Error generating Pint Pulse:", err);
            setError(err.message || "An error occurred while generating the report.");
            trackEvent('social_hub_scan_failed', { scan_type: 'pint_pulse', error: err.message });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    };
    
    const handleGeneratePintOfTheWeek = async () => {
        setIsLoading(true);
        setLoadingType('pint_of_week');
        setError(null);
        setPotentialContent([]);
        setStrategicReport(null);
        setGuinnessFactPost(null);
        setFilterAngle('all');
        trackEvent('social_hub_scan_start', { scan_type: 'pint_of_week' });
    
        try {
            const { data: topRatings, error: rpcError } = await supabase.rpc('get_top_ratings_of_the_week');
            if (rpcError) throw rpcError;
            if (!topRatings || topRatings.length === 0) {
                setError("Not enough high-quality ratings this week to select a winner.");
                setIsLoading(false);
                setLoadingType(null);
                return;
            }
    
            // Fetch and prepare images for analysis
            const imageParts = [];
            const ratingsWithImagePlaceholders = await Promise.all(topRatings.map(async (rating, index) => {
                if (!rating.image_url) return { ...rating, image_placeholder: null };
                try {
                    const response = await fetch(rating.image_url);
                    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const dataUrl = await new Promise(resolve => {
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    const base64Data = dataUrl.split(',')[1];
                    imageParts.push({ inlineData: { mimeType: blob.type, data: base64Data } });
                    return { ...rating, image_placeholder: `[IMAGE_CONTENDER_${index}]` };
                } catch (e) {
                    console.error(`Failed to process image for rating ${rating.id}:`, e);
                    return { ...rating, image_placeholder: null };
                }
            }));
            
            const dynamicPintOfTheWeekSchema = {
                ...pintOfTheWeekSchema,
                properties: {
                    ...pintOfTheWeekSchema.properties,
                    winning_contender_index: {
                        ...pintOfTheWeekSchema.properties.winning_contender_index,
                        minimum: 0,
                        maximum: topRatings.length - 1,
                    },
                },
            };
    
            const prompt = `
                You are 'Stoutly', a celebratory and expert Social Media Content Strategist for a Guinness rating app. Your task is to analyze the top 5 user-submitted pints from the past week AND THEIR CORRESPONDING IMAGES, and crown one as the "Pint of the Week".

                **Top 5 Contenders (JSON array with Image Placeholders):**
                \`\`\`json
                ${JSON.stringify(ratingsWithImagePlaceholders, null, 2)}
                \`\`\`

                **Your Task:**
                1.  **Select the Winner:** Visually analyze the provided images. The ideal winner has a perfect or near-perfect quality score, high likes, a POSITIVE user comment, and most importantly, A VISUALLY STUNNING PHOTOGRAPH of a perfectly poured pint. Prioritize aesthetic excellence above all else.
                2.  **Generate a JSON Output:** Based on your winning selection, provide a JSON object that adheres to the provided schema. You MUST return the zero-based INDEX of your chosen winner in the 'winning_contender_index' field. The 'post_caption' should be a complete, engaging, and ready-to-post caption for Instagram. It MUST credit the user (using their username) and the pub. Use newline characters (\\n) for line breaks to ensure it's formatted correctly for social media.
            `;
            
            const contents = [{ text: prompt }, ...imageParts];
    
            const response = await generateContentWithRetry({ 
                model: 'gemini-2.5-flash', 
                contents,
                config: { responseMimeType: 'application/json', responseSchema: dynamicPintOfTheWeekSchema },
            });
            
            const analysis = JSON.parse(response.text);
            const winnerIndex = analysis.winning_contender_index;
            const winnerRating = (winnerIndex >= 0 && winnerIndex < topRatings.length) ? topRatings[winnerIndex] : null;
            
            if (!winnerRating) {
                console.error("Error generating Pint of the week: AI returned an invalid winner index.", {
                    returnedIndex: winnerIndex,
                    validRange: `0-${topRatings.length - 1}`,
                });
                throw new Error("AI returned a winning_contender_index that is out of bounds.");
            }

            // Explicitly map properties from the flat RPC result to the nested structure expected by PintOfTheWeekCard.
            // This ensures all required data (image_url, price, etc.) is correctly passed.
            const formattedWinner = {
                id: winnerRating.id,
                quality: winnerRating.quality,
                price: winnerRating.price,
                exact_price: winnerRating.exact_price,
                image_url: winnerRating.image_url,
                pub_country_code: winnerRating.pub_country_code,
                pub_country_name: winnerRating.pub_country_name,
                user: {
                    id: winnerRating.user_id,
                    username: winnerRating.username,
                    avatar_id: winnerRating.avatar_id
                },
                pub: {
                    id: winnerRating.pub_id,
                    name: winnerRating.pub_name,
                    address: winnerRating.pub_address
                }
            };

            setStrategicReport({ 
                type: 'pint_of_the_week', 
                content: analysis, 
                winner: formattedWinner,
            });
            trackEvent('social_hub_scan_success', { scan_type: 'pint_of_the_week' });
    
        } catch (err) {
            console.error("Error generating Pint of the Week:", err);
            setError(err.message || "An error occurred while generating the report.");
            trackEvent('social_hub_scan_failed', { scan_type: 'pint_of_the_week', error: err.message });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    };
    
    const handleGenerateGuinnessFact = async () => {
        setIsLoading(true);
        setLoadingType('guinness_fact');
        setError(null);
        setPotentialContent([]);
        setStrategicReport(null);
        setGuinnessFactPost(null);
        trackEvent('social_hub_scan_start', { scan_type: 'guinness_fact' });
    
        try {
            // Step 1: Generate the fact
            const factPrompt = "Generate one surprising, witty, or little-known fact about Guinness beer, its history, or its culture. The fact should be concise and suitable for an Instagram story post. Do not repeat facts you have given recently. Format the output as a JSON object with a single key: 'factText'.";
            const factSchema = {
                type: Type.OBJECT,
                properties: {
                    factText: { type: Type.STRING, description: "The interesting fact about Guinness." }
                }
            };
    
            const factResponse = await generateContentWithRetry({
                model: 'gemini-2.5-flash',
                contents: factPrompt,
                config: { responseMimeType: 'application/json', responseSchema: factSchema },
            });
    
            const { factText } = JSON.parse(factResponse.text);
    
            // Step 2: Generate the image
            const imagePrompt = `A visually striking, high-quality photograph for an Instagram post. The image should creatively represent the following fact about Guinness: "${factText}". The style should be moody and atmospheric, with rich, dark tones and a touch of gold or cream color. Vertical 3:4 aspect ratio.`;
            
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: '3:4',
                },
            });
    
            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    
            // Step 3: Set state
            setGuinnessFactPost({ factText, imageUrl });
            trackEvent('social_hub_scan_success', { scan_type: 'guinness_fact' });
    
        } catch (err) {
            console.error("Error generating Guinness Fact:", err);
            setError(err.message || "An error occurred while generating the content.");
            trackEvent('social_hub_scan_failed', { scan_type: 'guinness_fact', error: err.message });
        } finally {
            setIsLoading(false);
            setLoadingType(null);
        }
    };

    const filteredContent = useMemo(() => {
        if (filterAngle === 'all') {
            return potentialContent;
        }
        return potentialContent.filter(content => content.aiAnalysis?.content_angle === filterAngle);
    }, [potentialContent, filterAngle]);

    if (view === 'location_stats') {
        return <LocationStatsPage onBack={() => setView('main')} />;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50">
            <header className="p-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 p-2 -ml-2 rounded-lg transition-colors">
                            <i className="fas fa-arrow-left"></i>
                            <span className="font-semibold hidden sm:inline">Back to Settings</span>
                        </button>
                        <div>
                            <h3 className="text-xl font-bold text-purple-500 dark:text-purple-400">Social Content Hub</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered content curation for social media.</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
                <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Single Post Analysis</h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Find individual user posts to feature on social media. Scans content from the last 7 days.
                    </p>
                    <button
                        onClick={handleScanForTopContent}
                        disabled={isLoading}
                        className="w-full bg-purple-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-purple-300 disabled:cursor-wait flex items-center justify-center space-x-2"
                    >
                        {loadingType === 'top_content' ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-star"></i>}
                        <span>Scan for Top Content</span>
                    </button>
                </section>
                
                <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Strategic Reports</h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Generate data-driven reports and summaries for higher-level content strategy.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button
                            onClick={handleGeneratePintPulse}
                            disabled={isLoading}
                            className="bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-wait flex items-center justify-center space-x-2"
                        >
                            {loadingType === 'pint_pulse' ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-chart-line"></i>}
                            <span>Weekly Pint Pulse</span>
                        </button>
                        <button
                            onClick={handleGeneratePintOfTheWeek}
                            disabled={isLoading}
                            className="bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-wait flex items-center justify-center space-x-2"
                        >
                            {loadingType === 'pint_of_week' ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-trophy"></i>}
                            <span>Pint of the Week</span>
                        </button>
                        <button
                            onClick={handleGenerateGuinnessFact}
                            disabled={isLoading}
                            className="bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-500 disabled:cursor-wait flex items-center justify-center space-x-2"
                        >
                            {loadingType === 'guinness_fact' ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <i className="fas fa-lightbulb"></i>}
                            <span>Guinness Fact</span>
                        </button>
                        <button
                            onClick={() => setView('location_stats')}
                            disabled={isLoading}
                            className="bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-wait flex items-center justify-center space-x-2"
                        >
                            <i className="fas fa-chart-area"></i>
                            <span>Location Graphics</span>
                        </button>
                    </div>
                </section>

                {error && <div className="text-center text-red-500 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</div>}

                {strategicReport?.type === 'pint_pulse' && (
                    <PintPulseReportCard title="Weekly Pint Pulse" content={strategicReport.content} />
                )}
                {strategicReport?.type === 'pint_of_the_week' && (
                    <PintOfTheWeekCard report={strategicReport.content} winner={strategicReport.winner} />
                )}
                {guinnessFactPost && (
                    <GuinnessFactCard report={guinnessFactPost} />
                )}

                {potentialContent.length > 0 && !strategicReport && !guinnessFactPost && (
                    <section className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md animate-fade-in-down">
                        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Filter by Angle</h4>
                        <div className="flex flex-wrap gap-2">
                            {['all', ...Object.keys(ANGLE_CONFIG)].map(angle => (
                                <button
                                    key={angle}
                                    onClick={() => setFilterAngle(angle)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                                        filterAngle === angle
                                            ? 'bg-purple-500 text-white shadow'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {angle === 'all' ? 'All' : ANGLE_CONFIG[angle].label}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {!isLoading && !strategicReport && !guinnessFactPost && !error && (
                    filteredContent.length > 0 ? (
                        <div className="space-y-4">
                            {filteredContent.map(content => (
                                <SocialContentCard key={content.id} content={content} />
                            ))}
                        </div>
                    ) : potentialContent.length > 0 ? (
                        <div className="text-center text-gray-500 p-8">
                            <i className="fas fa-filter fa-2x mb-3"></i>
                            <p className="font-semibold">No content matches the current filter.</p>
                            <p className="text-sm">Try selecting another angle or "All".</p>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-8">
                            <i className="fas fa-box-open fa-3x mb-4"></i>
                            <p className="font-semibold">Ready to find some gems?</p>
                            <p>Click a scan button to find potential social media posts.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default SocialContentHub;