const OpenAI = require('openai');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class MealPlanGenerator {
    constructor(apiKey, config = {}) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.openai = new OpenAI({ apiKey });
        this.model = config.model || 'gpt-4o';
        this.maxCompletionTokens = config.maxCompletionTokens || config.maxTokens || 16000;
        this.temperature = config.temperature || 0.7;
        console.log(`✓ Meal Plan Generator configured: Model=${this.model}, MaxCompletionTokens=${this.maxCompletionTokens}, Temperature=${this.temperature}`);
    }

    /**
     * Parse excluded ingredients from JSON string or array
     */
    parseExcludedIngredients(excluded) {
        if (!excluded) return '';
        try {
            const parsed = typeof excluded === 'string' ? JSON.parse(excluded) : excluded;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.join(', ');
            }
        } catch (e) {
            return excluded;
        }
        return '';
    }

    /**
     * Generate a personalized keto meal plan using GPT-4
     */
    async generateMealPlan(leadData) {
        const {
            name,
            language = 'da',
            gender,
            age,
            weight,
            height,
            activity,
            daily_calories,
            meals_per_day = 3,
            num_days = 7,
            prep_time,
            leftovers,
            excluded_ingredients = '',
            diet_type = 'Custom Keto'
        } = leadData;

        // Build the prompt for GPT-4
        const prompt = this.buildPrompt(leadData);

        try {
            console.log('🤖 Generating meal plan with GPT-4...');

            // Build system message with excluded ingredients warning
            const excludedWarning = leadData.excluded_ingredients && leadData.excluded_ingredients !== '[]' && leadData.excluded_ingredients !== ''
                ? `\n\nKRITISK REGEL: Klienten har allergier/præferencer. Du må ALDRIG bruge disse ingredienser: ${this.parseExcludedIngredients(leadData.excluded_ingredients)}. Brug alternativer i stedet!`
                : '';

            // GPT-5 nano and mini only support temperature=1 (default)
            const apiParams = {
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: `Du er en professionel keto ernæringsekspert og kok. Du laver personlige, detaljerede madplaner med nøjagtige opskrifter, ingredienslister og næringsværdier.${excludedWarning}`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_completion_tokens: this.maxCompletionTokens
            };

            // Only add temperature for models that support it (GPT-5.1)
            if (this.model === 'gpt-5.1') {
                apiParams.temperature = this.temperature;
            }

            const completion = await this.openai.chat.completions.create(apiParams);

            const mealPlanText = completion.choices[0].message.content;
            console.log('✓ Meal plan generated successfully');

            return {
                success: true,
                mealPlan: mealPlanText,
                tokens: completion.usage.total_tokens,
                cost: this.calculateCost(completion.usage),
                model: this.model
            };
        } catch (error) {
            console.error('Error generating meal plan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build the GPT-4 prompt based on lead data
     */
    buildPrompt(leadData) {
        const {
            name,
            language = 'da',
            gender,
            age,
            weight,
            height,
            activity,
            daily_calories,
            meals_per_day = 3,
            num_days = 7,
            prep_time,
            leftovers,
            excluded_ingredients = '',
            diet_type = 'Custom Keto'
        } = leadData;

        const langMap = {
            'da': 'dansk',
            'en': 'engelsk',
            'se': 'svensk'
        };

        const activityMap = {
            'sedentary': 'stillesiddende',
            'light': 'let aktiv',
            'moderate': 'moderat aktiv',
            'active': 'meget aktiv',
            'very_active': 'ekstrem aktiv'
        };

        const prepTimeMap = {
            'fast': 'hurtige retter (15-20 min)',
            'medium': 'medium (20-40 min)',
            'long': 'ingen tidsbegrænsning (40+ min)',
            'mix': 'blandet'
        };

        // Handle both JSON array and comma-separated string
        let excludedList = 'ingen';
        if (excluded_ingredients) {
            try {
                // Try to parse as JSON array
                const parsed = typeof excluded_ingredients === 'string'
                    ? JSON.parse(excluded_ingredients)
                    : excluded_ingredients;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    excludedList = parsed.join(', ');
                }
            } catch (e) {
                // If not JSON, treat as comma-separated string
                excludedList = excluded_ingredients.split(',').map(i => i.trim()).join(', ');
            }
        }

        let prompt = `Lav en personlig ${num_days}-dages keto madplan på ${langMap[language] || 'dansk'}.

PERSON PROFIL:
- Navn: ${name || 'Klient'}
- Køn: ${gender === 'male' ? 'Mand' : 'Kvinde'}
- Alder: ${age} år
- Vægt: ${weight} kg
- Højde: ${height} cm
- Aktivitetsniveau: ${activityMap[activity] || activity}
- Dagligt kaloriebehov: ${daily_calories} kcal
- Antal måltider per dag: ${meals_per_day}
- Tilberedningstid: ${prepTimeMap[prep_time] || prep_time}
- Leftovers: ${leftovers ? 'Ja' : 'Nej'}
- Ekskluderede ingredienser: ${excludedList}
- Diet type: ${diet_type}

KRAV TIL MADPLANEN:
1. KETO MAKROER: Hver dag skal være ~70% fedt, ~25% protein, ~5% kulhydrat (max 20-30g netto karbs)
2. KALORIER: Total daglig skal være omkring ${daily_calories} kcal (±50 kcal acceptabelt)
3. MÅLTIDER: ${meals_per_day} måltider per dag
4. SPROG: Skriv HELE madplanen på ${langMap[language] || 'dansk'}
5. ANTAL DAGE: Du skal lave PRÆCIS ${num_days} dage. IKKE færre! Lav alle ${num_days} dage med komplette opskrifter.
${excludedList !== 'ingen' ? `6. ⚠️ EKSKLUDEREDE INGREDIENSER (MEGET VIGTIGT): Du må ALDRIG bruge følgende ingredienser: ${excludedList}. Dette er klientens allergier/præferencer. Brug ALTID alternativer!` : ''}
${leftovers ? `${excludedList !== 'ingen' ? '7' : '6'}. LEFTOVERS: Design aftenmadsopskrifter med ekstra portioner der kan bruges som frokost næste dag` : ''}

OUTPUT FORMAT:
Skriv madplanen i følgende format:

# ${num_days}-Dages Keto Madplan for ${name || 'Klient'}

## Uge Oversigt
[Kort introduktion]

## Indkøbsliste
[Komplet liste efter kategorier: Kød & Fisk, Grøntsager, Mejeriprodukter, Andet]

---

## Dag 1

### Morgenmad: [Navn] (XX min)
**Ingredienser:**
- [ingrediens] - [mængde]

**Tilberedning:**
1. [step-by-step, max 4-5 steps]

**Næringsværdi:**
Kalorier: XX kcal | Protein: XX g | Fedt: XX g | Kulhydrat: XX g | Fiber: XX g | Netto karbs: XX g

### Frokost: [Navn] (XX min)
[samme struktur]

### Aftensmad: [Navn] (XX min)
[samme struktur]

**Daglig Total:**
Kalorier: XX kcal | Protein: XX g | Fedt: XX g | Kulhydrat: XX g | Netto karbs: XX g

---

[Gentag for ALLE ${num_days} dage - lav dem alle!]

## Tips & Tricks
[3-5 praktiske keto tips]

---

VIGTIGT: Lav ALLE ${num_days} dage med komplette opskrifter. Brug IKKE nogen af de ekskluderede ingredienser!`;

        return prompt;
    }

    /**
     * Calculate estimated cost based on token usage
     */
    calculateCost(usage) {
        // OpenAI Pricing (Feb 2026) - https://platform.openai.com/docs/pricing
        const pricing = {
            'gpt-4o': {
                input: 2.50,   // $2.50 per 1M input tokens
                output: 10.00  // $10.00 per 1M output tokens
            },
            'gpt-4o-mini': {
                input: 0.150,  // $0.150 per 1M input tokens
                output: 0.600  // $0.600 per 1M output tokens
            },
            'gpt-5-mini': {
                input: 0.150,  // $0.150 per 1M input tokens (assumed same as 4o-mini)
                output: 0.600  // $0.600 per 1M output tokens
            },
            'gpt-5-nano': {
                input: 0.030,  // $0.030 per 1M input tokens (assumed)
                output: 0.120  // $0.120 per 1M output tokens
            },
            'gpt-5.1': {
                input: 5.00,   // $5.00 per 1M input tokens (assumed)
                output: 15.00  // $15.00 per 1M output tokens
            }
        };

        const modelPricing = pricing[this.model] || pricing['gpt-4o'];

        const inputCost = (usage.prompt_tokens / 1000000) * modelPricing.input;
        const outputCost = (usage.completion_tokens / 1000000) * modelPricing.output;

        return {
            input: inputCost.toFixed(4),
            output: outputCost.toFixed(4),
            total: (inputCost + outputCost).toFixed(4),
            currency: 'USD'
        };
    }

    /**
     * Generate PDF from meal plan text
     */
    async generatePDF(mealPlanText, leadData, outputPath) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    },
                    bufferPages: true
                });

                const stream = fs.createWriteStream(outputPath);
                doc.pipe(stream);

                // Simple clean header
                doc.fontSize(24)
                   .fillColor('#2d3748')
                   .font('Helvetica-Bold')
                   .text('Din Personlige Keto Madplan', { align: 'center' });

                doc.moveDown(1);

                // Simple horizontal line
                doc.moveTo(50, doc.y)
                   .lineTo(545, doc.y)
                   .strokeColor('#e2e8f0')
                   .stroke();

                doc.moveDown(1.5);

                // Parse and format the meal plan text
                const lines = mealPlanText.split('\n');

                for (let line of lines) {
                    // Check if we need a new page
                    if (doc.y > 700) {
                        doc.addPage();
                    }

                    line = line.trim();
                    if (!line) {
                        doc.moveDown(0.5);
                        continue;
                    }

                    // Headers (# and ##)
                    if (line.startsWith('# ')) {
                        doc.moveDown(0.8);
                        doc.fontSize(20)
                           .fillColor('#2d3748')
                           .font('Helvetica-Bold')
                           .text(line.substring(2));
                        doc.moveDown(0.6);
                    } else if (line.startsWith('## ')) {
                        doc.moveDown(0.8);
                        doc.fontSize(16)
                           .fillColor('#4a5568')
                           .font('Helvetica-Bold')
                           .text(line.substring(3));
                        doc.moveDown(0.5);
                    } else if (line.startsWith('### ')) {
                        doc.moveDown(0.5);
                        doc.fontSize(13)
                           .fillColor('#2d3748')
                           .font('Helvetica-Bold')
                           .text(line.substring(4));
                        doc.moveDown(0.3);
                    } else if (line.startsWith('**') && line.endsWith('**')) {
                        // Bold text
                        doc.fontSize(11)
                           .fillColor('#2d3748')
                           .font('Helvetica-Bold')
                           .text(line.replace(/\*\*/g, ''));
                        doc.moveDown(0.3);
                    } else if (line.startsWith('- ') || line.startsWith('* ')) {
                        // Bullet points - remove emoji and clean text
                        const cleanLine = line.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                        doc.fontSize(10)
                           .fillColor('#4a5568')
                           .font('Helvetica')
                           .text(cleanLine, {
                               indent: 20,
                               width: 495,
                               lineGap: 4
                           });
                    } else if (/^\d+\./.test(line)) {
                        // Numbered list - handle bold sections properly
                        const cleanLine = line.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();

                        // Check if line contains ** for bold sections
                        if (cleanLine.includes('**')) {
                            // Split on ** to handle bold/regular text
                            const parts = cleanLine.split('**');
                            let currentX = 70; // Start position with indent

                            parts.forEach((part, index) => {
                                if (part.trim()) {
                                    const isBold = index % 2 === 1; // Odd indices are bold
                                    doc.fontSize(10)
                                       .fillColor('#4a5568')
                                       .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                                       .text(part, currentX, doc.y, {
                                           continued: index < parts.length - 1,
                                           width: 495 - (currentX - 50),
                                           lineBreak: false
                                       });
                                }
                            });
                            doc.text(''); // End the line
                            doc.moveDown(0.3);
                        } else {
                            // Regular numbered list without bold
                            doc.fontSize(10)
                               .fillColor('#4a5568')
                               .font('Helvetica')
                               .text(cleanLine, {
                                   indent: 20,
                                   width: 495,
                                   lineGap: 3
                               });
                        }
                    } else if (line === '---') {
                        // Horizontal line
                        doc.moveDown(0.6);
                        doc.moveTo(50, doc.y)
                           .lineTo(545, doc.y)
                           .strokeColor('#e2e8f0')
                           .stroke();
                        doc.moveDown(0.6);
                    } else {
                        // Regular text - remove emoji and clean
                        const cleanLine = line.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
                        if (cleanLine) {  // Only render if there's text after emoji removal
                            doc.fontSize(10)
                               .fillColor('#4a5568')
                               .font('Helvetica')
                               .text(cleanLine, {
                                   width: 495,
                                   align: 'left',
                                   lineGap: 2
                               });
                        }
                    }
                }

                // Simple footer
                doc.fontSize(8)
                   .fillColor('#a0aec0')
                   .text(
                       `Keto Calculator`,
                       50,
                       doc.page.height - 30,
                       { align: 'center' }
                   );

                doc.end();

                stream.on('finish', () => {
                    console.log('✓ PDF generated successfully:', outputPath);
                    resolve(outputPath);
                });

                stream.on('error', reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Complete workflow: Generate meal plan and PDF
     */
    async generateComplete(leadData) {
        // Generate meal plan text with GPT-4
        const result = await this.generateMealPlan(leadData);

        if (!result.success) {
            return result;
        }

        // Generate PDF filename
        const timestamp = Date.now();
        const fileName = `madplan_${leadData.email.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`;
        const outputPath = path.join(__dirname, 'generated_mealplans', fileName);

        // Ensure directory exists
        const dir = path.join(__dirname, 'generated_mealplans');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Generate PDF
        try {
            await this.generatePDF(result.mealPlan, leadData, outputPath);

            return {
                success: true,
                mealPlanText: result.mealPlan,
                pdfPath: outputPath,
                pdfFileName: fileName,
                tokens: result.tokens,
                cost: result.cost,
                model: result.model
            };
        } catch (error) {
            console.error('Error generating PDF:', error);
            return {
                success: false,
                error: error.message,
                mealPlanText: result.mealPlan // Return text even if PDF fails
            };
        }
    }
}

module.exports = MealPlanGenerator;
