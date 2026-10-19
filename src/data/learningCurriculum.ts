import { Lesson, TopicCategoryInfo } from '../types/learning';

export const TOPIC_CATEGORIES: TopicCategoryInfo[] = [
  {
    id: 'soil-basics',
    title: 'Soil Basics',
    tagline: 'The Foundation of Yield',
    description: 'Understand soil texture, pH, essential nutrients, and the critical difference between measured lab values and regional estimates.',
    color: 'emerald',
  },
  {
    id: 'soil-health',
    title: 'Soil Health',
    tagline: 'Living, Resilient Soils',
    description: 'Learn how organic matter, soil structure, biological life, and erosion control safeguard long-term farm productivity.',
    color: 'amber',
  },
  {
    id: 'weather-climate',
    title: 'Weather & Climate',
    tagline: 'Navigating Rainfall & Seasons',
    description: 'Interpret seasonal outlooks, manage rainfall variability, prepare for dry spells, and align planting dates with moisture patterns.',
    color: 'sky',
  },
  {
    id: 'crop-suitability',
    title: 'Crop Suitability',
    tagline: 'Matching Crops to Land',
    description: 'Discover why certain crops flourish in specific soils, how pH affects nutrient uptake, and how to avoid costly mismatches.',
    color: 'teal',
  },
  {
    id: 'sustainable-management',
    title: 'Sustainable Soil Management',
    tagline: 'Practical Practices for High Yields',
    description: 'Master Integrated Soil Fertility Management (ISFM), compost preparation, liming acidic fields, and moisture conservation mulching.',
    color: 'stone',
  },
];

export const INITIAL_LESSONS: Lesson[] = [
  // 1. SOIL BASICS
  {
    id: 'soil-basics-1',
    slug: 'what-is-soil',
    title: 'What is Soil, and Why Does it Matter?',
    subtitle: 'Moving beyond "dirt": your soil is a living biological engine.',
    topic: 'soil-basics',
    difficulty: 'foundational',
    estimatedMinutes: 4,
    format: 'guide',
    order: 1,
    summary: 'Soil is not inert dirt; it is a dynamic mixture of mineral particles, living microorganisms, decayed organic matter, air, and water that feeds your crops.',
    youtubeVideoId: 'if29yg-3t6s',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=if29yg-3t6s',
    videoTitle: 'FAO: Soil is Where Food Begins - The Living Soil Engine',
    keyTakeaways: [
      'Healthy topsoil contains mineral grains (sand, silt, clay), organic matter, pore space for water, and trillions of beneficial microbes.',
      'Roots require both moisture and oxygen; compacted or depleted soil starves roots of oxygen even when water is applied.',
      'Treating soil as a living asset rather than an empty container preserves its natural fertility for future growing seasons.'
    ],
    practicalAction: 'Take a spadeful of topsoil from your farm. Smell it and inspect it: rich, healthy soil smells earthy (from beneficial actinomycetes microbes) and shows crumbs rather than brick-hard dry clods.',
    whatThisMeansForYourFarm: 'Every agricultural recommendation in SoilWise AI begins by assessing whether your soil can physically deliver air, water, and minerals to the crop roots.',
    contentSections: [
      {
        title: 'The Four Components of Agricultural Soil',
        body: 'Ideal productive soil is composed of roughly 45% mineral particles, 25% water, 25% air, and 5% organic matter. In many tropical and savanna soils, continuous cultivation without returning organic residues has reduced organic matter to under 1%, causing poor water retention and high fertilizer loss.',
        bulletPoints: [
          'Minerals: Weathered rock fragments providing structural anchor and mineral reserve.',
          'Organic Matter: Decomposed plant residues and dung acting as a sponge for moisture and nutrients.',
          'Pore Spaces: Gaps holding air for root respiration and soil moisture between rains.',
          'Soil Biology: Earthworms, bacteria, and mycorrhizal fungi that unlock tied-up nutrients.'
        ]
      },
      {
        title: 'Why Chemical Fertilizer Alone is Not Enough',
        body: 'Adding mineral fertilizer (like Urea or NPK) to soil without organic matter is like feeding salt to a thirsty plant. Organic matter provides the Cation Exchange Capacity (CEC)—the electrical docking stations that hold onto fertilizer nutrients so rains do not wash them away.',
        callout: {
          type: 'tip',
          text: 'Farmers who combine small doses of chemical fertilizer with animal manure or compost consistently see 30–50% higher fertilizer use efficiency.'
        }
      }
    ],
    knowledgeCheck: {
      question: 'What is the primary role of soil organic matter in your field?',
      options: [
        'It makes the soil completely waterproof so rain rolls off.',
        'It acts like a sponge holding both moisture and applied fertilizer nutrients.',
        'It replaces the need for crop seeds.',
        'It eliminates sunlight from reaching the topsoil.'
      ],
      correctIndex: 1,
      explanation: 'Soil organic matter has immense moisture-holding and nutrient-binding capacity, preventing fertilizer runoff and buffering against mid-season droughts.'
    },
    relevantSoilProperties: ['organic_carbon', 'texture'],
    relevantCrops: ['Maize', 'Sorghum', 'Cowpea', 'Millet'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'soil-basics-2',
    slug: 'soil-texture-sand-silt-clay',
    title: 'Soil Texture: Sand, Silt, and Clay',
    subtitle: 'How mineral grain sizes dictate water drainage and nutrient storage.',
    topic: 'soil-basics',
    difficulty: 'foundational',
    estimatedMinutes: 5,
    format: 'practical',
    order: 2,
    summary: 'Soil texture describes the proportion of sand, silt, and clay particles. Unlike soil fertility, texture cannot be permanently changed, so farm practices must adapt to it.',
    youtubeVideoId: 'GWZwbVJCNec',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=GWZwbVJCNec',
    videoTitle: 'USDA NRCS: Testing Soil Texture by Feel (Ribbon Method)',
    keyTakeaways: [
      'Sand particles are largest and drain quickly; clay particles are microscopic and bind water tightly.',
      'Sandy soils need frequent, smaller fertilizer applications ("split applications") to prevent leaching.',
      'Clay soils hold nutrients well but risk waterlogging and root rot if drainage is poor during heavy downpours.'
    ],
    practicalAction: 'The Jar or Ribbon Test: Moisten a small ball of soil and rub it between your thumb and forefinger. Gritty feel = high sand. Silky/smooth = silt. Sticky and forms a long flexible ribbon = clay.',
    whatThisMeansForYourFarm: 'SoilWise AI factors in your soil texture class to recommend optimal planting dates, irrigation intervals, and whether to split your nitrogen applications into two or three doses.',
    contentSections: [
      {
        title: 'Comparing the Three Soil Fractions',
        body: 'Every soil is a combination of three mineral sizes: sand (0.05–2.0 mm), silt (0.002–0.05 mm), and clay (<0.002 mm). Loam represents the balanced middle ground prized by cereal and legume farmers.',
        bulletPoints: [
          'Sandy Soils (Sandy Loam, Loamy Sand): Highly aerated, warm up fast, but dry out within 3–4 rainless days.',
          'Loam Soils: Balanced moisture retention, easy tillage, ideal for maize, soybean, and vegetables.',
          'Clay Soils: Heavy, prone to crusting, but nutrient-rich. Requires careful timing to avoid tilling when wet.'
        ]
      },
      {
        title: 'Managing Sandy Savanna Soils',
        body: 'If your farm has sandy loam or loamy sand (common in Northern Nigerian savanna zones), applying 100% of your Urea fertilizer at planting is wasteful. Heavy rain will wash the nitrogen deep below the root zone. Instead, apply 1/3 at planting and 2/3 when the crop reaches knee-high.',
        callout: {
          type: 'warning',
          text: 'Never apply full mineral fertilizer directly onto dry sandy soil before a forecast heavy rain event.'
        }
      }
    ],
    knowledgeCheck: {
      question: 'Why should farmers with sandy soils split their fertilizer applications into multiple doses?',
      options: [
        'Because sandy soils cannot absorb seeds.',
        'Because sandy soils drain rapidly and nutrients easily wash below crop roots if applied all at once.',
        'Because clay will destroy the fertilizer.',
        'Because fertilizer turns into rock in sand.'
      ],
      correctIndex: 1,
      explanation: 'Sandy soils have low nutrient-holding capacity and fast infiltration rates; splitting applications ensures crops receive nitrogen when roots are actively feeding.'
    },
    relevantSoilProperties: ['texture'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'soil-basics-3',
    slug: 'understanding-soil-ph',
    title: 'Understanding Soil pH: The Nutrient Gatekeeper',
    subtitle: 'Why fertilizer fails when your soil is too acidic or too alkaline.',
    topic: 'soil-basics',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    format: 'guide',
    order: 3,
    summary: 'Soil pH measures acidity or alkalinity on a scale of 0 to 14. When pH falls below 5.5 (strongly acidic), crops cannot absorb phosphorus and nitrogen even if you apply expensive fertilizer.',
    youtubeVideoId: '5_xJ1Hn749o',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=5_xJ1Hn749o',
    videoTitle: 'Understanding Soil pH & Nutrient Availability for Agricultural Crops',
    keyTakeaways: [
      'The ideal pH range for most West African cereals, legumes, and tubers is 6.0 to 7.0.',
      'At pH < 5.2, aluminum and iron become toxic to young crop roots and lock up applied phosphorus.',
      'Applying agricultural lime or wood ash neutralizes acidity and restores fertilizer effectiveness.'
    ],
    practicalAction: 'If your SoilWise AI report shows pH below 5.5, plan to apply agricultural lime (calcium carbonate) or screened hardwood ash before land preparation for the next season.',
    whatThisMeansForYourFarm: 'When SoilWise AI detects estimated or measured acidity, it alerts you that fertilizer ROI will be depressed until soil pH is buffered toward 6.0–6.5.',
    contentSections: [
      {
        title: 'The pH Scale for Farmers',
        body: 'A soil pH of 7.0 is neutral. Values below 7.0 are acidic; values above 7.0 are alkaline. In many high-rainfall tropical regions and intensively farmed savanna areas, leaching of calcium and continuous use of ammonium fertilizers lowers soil pH into the acidic zone.',
        bulletPoints: [
          'pH < 5.0 (Very Strongly Acidic): Severe nutrient lockout, aluminum toxicity risk.',
          'pH 5.5–6.8 (Slightly Acidic to Neutral): Optimal range for maize, sorghum, cowpea, and groundnut.',
          'pH > 7.8 (Alkaline / Calcareous): Zinc and iron deficiencies common; common in poorly drained arid areas.'
        ]
      },
      {
        title: 'The "Locked Fertilizer" Dilemma',
        body: 'Studies show that in soil with a pH of 5.0, up to 70% of applied phosphorus (such as TSP or DAP) becomes permanently bound to iron and aluminum compounds within 48 hours, rendering it unavailable to the crop. Raising pH to 6.2 immediately unlocks this phosphorus reserve.',
        callout: {
          type: 'tip',
          text: 'Wood ash from cooking fires contains potassium and calcium carbonate; broadcasted evenly at 500–1000 kg/ha, it provides a low-cost liming remedy for smallholder fields.'
        }
      }
    ],
    knowledgeCheck: {
      question: 'What happens to expensive phosphorus fertilizer when applied to strongly acidic soil (pH < 5.0)?',
      options: [
        'It evaporates into the atmosphere as nitrogen gas.',
        'It gets locked by iron and aluminum minerals so crop roots cannot take it up.',
        'It instantly multiplies earthworm numbers.',
        'It changes sandy soil into heavy clay.'
      ],
      correctIndex: 1,
      explanation: 'In acidic soils, aluminum and iron bind with phosphate ions, creating insoluble minerals that crop roots cannot absorb, wasting your fertilizer investment.'
    },
    relevantSoilProperties: ['ph', 'phosphorus'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'soil-basics-4',
    slug: 'measured-vs-estimated-soil-data',
    title: 'Understanding Measured vs Estimated Soil Data',
    subtitle: 'Transparency: why SoilWise AI distinguishes lab tests from regional grids.',
    topic: 'soil-basics',
    difficulty: 'foundational',
    estimatedMinutes: 4,
    format: 'guide',
    order: 4,
    summary: 'SoilWise AI explicitly marks each metric as either farmer-measured (laboratory test) or location-estimated (from ISRIC / iSDAsoil geospatial grids) so you always know the confidence level.',
    youtubeVideoId: 'L3kF9xZk3e8',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=L3kF9xZk3e8',
    videoTitle: 'ISRIC SoilGrids: Mapping Digital Soil Information & Field Evidence',
    keyTakeaways: [
      'Location estimates provide a valuable regional baseline when a physical soil test is not yet available.',
      'Soil properties can vary across a few meters due to termite mounds, topography, and past manure piles.',
      'A physical lab test is always recommended before making large capital investments in fertilizer or land development.'
    ],
    practicalAction: 'Check the badge next to each property on your SoilWise Analysis page: "User Measured" confirms your lab result, while "Location Estimated" indicates geospatial models were used.',
    whatThisMeansForYourFarm: 'We believe farmers deserve full honesty about data provenance. We never present an estimated value as a proven laboratory fact.',
    contentSections: [
      {
        title: 'How Location-Based Estimates Work',
        body: 'When you drop a pin on your farm location, SoilWise AI queries global soil data systems (such as ISRIC SoilGrids and iSDAsoil). These models combine satellite imagery, elevation maps, and thousands of soil test samples across Africa to calculate the most probable soil parameters at your coordinates.',
        bulletPoints: [
          'High Confidence: Soil texture, regional pH trends, and climate baselines.',
          'Moderate Confidence: Soil organic carbon and regional CEC.',
          'Local Variability: Available phosphorus and nitrogen can change dramatically depending on what you planted last year.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'What should a farmer know about a "Location Estimated" soil property in SoilWise AI?',
      options: [
        'It was measured by an agronomist digging in your field this morning.',
        'It is a high-confidence regional geospatial estimate, but local farm history can cause variations.',
        'It is 100% guaranteed to be identical to a laboratory test.',
        'It means the soil has zero fertility.'
      ],
      correctIndex: 1,
      explanation: 'Geospatial estimates reflect regional landscape patterns but cannot account for specific local management practices like heavy manure application or erosion on an individual plot.'
    },
    relevantSoilProperties: ['ph', 'organic_carbon', 'texture', 'nitrogen', 'phosphorus', 'potassium'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },

  // 2. SOIL HEALTH
  {
    id: 'soil-health-1',
    slug: 'what-makes-soil-healthy',
    title: 'Soil Fertility vs Soil Health: What Is the Difference?',
    subtitle: 'Fertility is how many nutrients are in the soil; health is the biological capacity to sustain life.',
    topic: 'soil-health',
    difficulty: 'foundational',
    estimatedMinutes: 5,
    format: 'guide',
    order: 1,
    summary: 'A field can have high chemical fertility (after adding bags of fertilizer) yet still have terrible soil health (compacted, crusted, no biological activity, eroding away). True yield resilience comes from soil health.',
    youtubeVideoId: 'n2mg6h_oZ98',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=n2mg6h_oZ98',
    videoTitle: 'The Science of Soil Health: Soil Biology & Organic Resilience',
    keyTakeaways: [
      'Chemical fertility measures available N, P, and K; soil health encompasses physical structure, water drainage, and biological life.',
      'Healthy soil survives droughts better because porous organic structure stores rainwater for weeks.',
      'Continuous monocropping and burning crop residues destroys soil biology, leading to sudden yield collapses.'
    ],
    practicalAction: 'Leave crop residue (such as sorghum or maize stalks) chopped on your field after harvest rather than burning it. This feeds soil earthworms and shields the surface from wind erosion.',
    whatThisMeansForYourFarm: 'SoilWise AI emphasizes conservation practices alongside fertilizer rates so you build an enduring soil asset, not just a one-season harvest.',
    contentSections: [
      {
        title: 'The Three Pillars of Soil Health',
        body: 'Productive farming rests on three interconnected pillars:',
        bulletPoints: [
          'Physical: Soil aggregation, pore spaces, soft uncompacted structure that allows roots to go 1.5 meters deep.',
          'Chemical: Adequate pH, balanced macronutrients (N, P, K), and micronutrients (Zinc, Boron).',
          'Biological: Earthworms, beneficial fungi, and bacteria decomposing organic matter and suppressing diseases.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'Which of the following field practices actively improves soil biological health?',
      options: [
        'Burning all crop residues immediately after harvest.',
        'Applying compost or animal manure and practicing crop rotation with legumes.',
        'Tilling the soil repeatedly until it turns into powder.',
        'Flooding the field with salty water.'
      ],
      correctIndex: 1,
      explanation: 'Organic amendments supply carbon for soil microorganisms, while legume rotations encourage nitrogen-fixing rhizobia bacteria.'
    },
    relevantSoilProperties: ['organic_carbon', 'texture'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'soil-health-2',
    slug: 'soil-erosion-and-degradation',
    title: 'Soil Erosion & Degradation: Stopping Topsoil Loss',
    subtitle: 'It takes 500 years to form 2 cm of topsoil, but one torrential storm can wash it away.',
    topic: 'soil-health',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    format: 'practical',
    order: 2,
    summary: 'In savanna and tropical agriculture, torrential rainfall and harmattan winds strip the fertile top 10 cm of soil where 80% of nutrients reside. Simple physical barriers keep your soil where it belongs.',
    youtubeVideoId: '9nQJ2s6rVbU',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=9nQJ2s6rVbU',
    videoTitle: 'Soil Conservation & Erosion Control: Contour Ridges and Bunds',
    keyTakeaways: [
      'Sheet erosion carries away the finest clay and organic particles first, leaving behind coarse infertile sand.',
      'Farming across the slope (contour ridging) reduces runoff velocity and gives water time to soak into the root zone.',
      'Vetiver grass strips and stone bunds on gentle slopes prevent small rills from developing into destructive gullies.'
    ],
    practicalAction: 'Always make your planting ridges perpendicular (across) the slope of the land, never parallel to the slope. Ridges running downhill turn into water canals that wash away your seeds.',
    whatThisMeansForYourFarm: 'If your farm is located on sloping terrain, SoilWise AI recommends contour ridges and mulching to keep valuable fertilizer from running off into nearby streams.',
    contentSections: [
      {
        title: 'The Mechanics of Water Erosion in Northern Nigeria',
        body: 'During early rains (May–June), heavy convective storms hit bare, newly tilled fields. High-velocity raindrops shatter soil aggregates, creating a dense surface crust that seals off infiltration. Water that cannot soak in begins moving downhill, taking seeds, topsoil, and applied fertilizer with it.',
        callout: {
          type: 'warning',
          text: 'Surface crusting can reduce water infiltration by up to 80%, meaning even after a 40 mm rainfall, subsoil stays dry!'
        }
      }
    ],
    knowledgeCheck: {
      question: 'How should planting ridges be oriented on sloping farmland?',
      options: [
        'Straight downhill so water drains away as fast as possible.',
        'Across (perpendicular to) the slope to slow water down and allow it to soak in.',
        'In small circular pits only.',
        'Oriented towards the sunrise regardless of slope.'
      ],
      correctIndex: 1,
      explanation: 'Contour ridges built across the slope trap runoff, give moisture time to infiltrate, and prevent soil and fertilizer from washing downhill.'
    },
    relevantSoilProperties: ['organic_carbon', 'texture'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'soil-health-3',
    slug: 'composting-and-manure',
    title: 'Composting & Manure Preparation',
    subtitle: 'Turn farm wastes into black gold for your crops.',
    topic: 'soil-health',
    difficulty: 'intermediate',
    estimatedMinutes: 5,
    format: 'practical',
    order: 3,
    summary: 'Fresh livestock manure can burn seedling roots and introduce weed seeds. Cured compost or properly fermented farmyard manure releases nutrients gradually and elevates soil carbon.',
    youtubeVideoId: 'b_7a0mPzX6A',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=b_7a0mPzX6A',
    videoTitle: 'Fast Composting & Farmyard Manure Curing for Smallholders',
    keyTakeaways: [
      'Decomposed compost improves both sandy soils (holds water) and heavy clay soils (improves drainage).',
      'The optimal compost pile combines "brown" carbon materials (dry stalks, straw) and "green" nitrogen materials (manure, green weeds) in roughly equal volumes.',
      'Keeping the compost moist and turning it once or twice ensures uniform decomposition within 6–8 weeks.'
    ],
    practicalAction: 'Dig a compost pit (1.5 m wide by 1 m deep) under tree shade. Layer dry stalks, animal dung, kitchen ash, and sprinkle with water. Cover with banana leaves or a tarp to conserve moisture.',
    whatThisMeansForYourFarm: 'Incorporating just 2 to 5 tons of well-cured compost per hectare can double the moisture-retention duration of your soil during two-week dry spells.',
    contentSections: [
      {
        title: 'Why Fresh Manure Hurts Seedlings',
        body: 'Fresh poultry or cattle dung contains high concentrations of raw ammonium and salts. When applied right before planting, it can draw moisture out of tender roots ("burning" the seedling) and rob soil nitrogen while microbes work to break down raw carbon.',
        bulletPoints: [
          'Cured Manure: Dark, crumbly, smells like forest soil, does not attract flies.',
          'Raw Manure: High heat generation, potent odor, contains live weed seeds.',
          'Timing: Apply cured compost 2–3 weeks before planting during land preparation.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'What is a key advantage of using well-cured compost over raw fresh manure?',
      options: [
        'It has an unpleasant smell that scares birds.',
        'It does not burn seedling roots, kills weed seeds, and releases nutrients in an easily absorbable form.',
        'It makes the soil completely sterile.',
        'It turns all crops into legumes.'
      ],
      correctIndex: 1,
      explanation: 'The curing and composting process breaks down caustic raw salts, kills weed seeds through gentle natural heat, and produces stable humic compounds.'
    },
    relevantSoilProperties: ['organic_carbon', 'nitrogen', 'phosphorus'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },

  // 3. WEATHER & CLIMATE
  {
    id: 'weather-climate-1',
    slug: 'weather-vs-climate-farming-calendar',
    title: 'Weather vs Climate: Planning Your Farming Calendar',
    subtitle: 'Understanding the difference between what happens today and what happens over 30 years.',
    topic: 'weather-climate',
    difficulty: 'foundational',
    estimatedMinutes: 5,
    format: 'guide',
    order: 1,
    summary: 'Weather is what happens in the atmosphere right now (a storm this afternoon, a dry week); climate is the long-term pattern over decades that tells you when your rainy season normally starts and stops.',
    youtubeVideoId: 'YbAWny7FV3w',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=YbAWny7FV3w',
    videoTitle: 'Weather vs Climate: Understanding Agricultural Climate Patterns',
    keyTakeaways: [
      'Climate determines which crop species can grow in your region (e.g. millet in the dry Sahel vs yam in the wet Guinea savanna).',
      'Weather determines daily farming operations (whether to spray pesticides, broadcast fertilizer, or harvest).',
      'Climate change is shifting onset dates and increasing rainfall intensity in Northern Nigeria, making flexible planning essential.'
    ],
    practicalAction: 'Check the 7-day weather forecast on your Farm Analysis page before spraying herbicides or applying top-dressing fertilizer. Never apply fertilizer if high wind (>25 km/h) or heavy rain is forecast within 6 hours.',
    whatThisMeansForYourFarm: 'SoilWise AI displays both your long-term seasonal outlook (climate pattern) and day-to-day Open-Meteo forecasts so you make both strategic and tactical choices.',
    contentSections: [
      {
        title: 'The Nigerian Agro-Ecological Transition',
        body: 'Nigeria transitions from the humid tropical south (bimodal rainfall, 1500–2500 mm/year) through the Southern and Northern Guinea Savannas (monomodal, 900–1200 mm/year) up to the Sudan and Sahel Savannas (400–700 mm/year with short 90–110 day rainy seasons).',
        bulletPoints: [
          'Sahel/Sudan: Prioritize early-maturing varieties (SAMMAZ maize, SAMNUT groundnut) tolerant to drought.',
          'Northern Guinea: Excellent for full-season maize, sorghum, soybeans, and cowpeas.',
          'Southern Savanna: Long seasons suitable for root crops, yam, and multiple grain cycles.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'Which statement accurately distinguishes weather from climate?',
      options: [
        'Weather is the 30-year average rainfall; climate is today’s temperature.',
        'Weather is the short-term state of the atmosphere right now; climate is the long-term regional pattern over decades.',
        'Weather only happens in cities; climate only happens in villages.',
        'Weather and climate are identical words with no difference.'
      ],
      correctIndex: 1,
      explanation: 'Weather refers to immediate, daily atmospheric conditions, while climate is the established long-term pattern that governs seasonal planting calendars.'
    },
    relevantWeatherAspects: ['rainfall', 'temperature'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'weather-climate-2',
    slug: 'interpreting-rainfall-forecasts',
    title: 'Interpreting Rainfall Forecasts & Seasonal Outlooks',
    subtitle: 'Understanding probability, onset false starts, and cessation timing.',
    topic: 'weather-climate',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    format: 'guide',
    order: 2,
    summary: 'A seasonal outlook provides expected onset (start of rains), expected cessation (end of rains), and total precipitation volume. Learning to interpret false starts protects your seed investment.',
    youtubeVideoId: '3O1_8qL2F3Q',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=3O1_8qL2F3Q',
    videoTitle: 'Using Weather & Climate Services for Smallholder Farming Decisions',
    keyTakeaways: [
      'The "Effective Onset" is not the first single shower in April; it is when cumulative rainfall is sufficient to maintain seedling survival.',
      'Planting too early after an isolated shower often leads to seed rot or seedling death during the subsequent dry spell ("false start").',
      'Look for at least 20–25 mm of accumulated rain across 3 consecutive days with moist soil down to 10 cm before planting.'
    ],
    practicalAction: 'Perform the "Hand Squeeze" test before planting: Dig down 10 cm. If the soil forms a ball that holds together when squeezed in your palm, it is ready. If it crumbles into dry dust, wait for the next steady rainfall.',
    whatThisMeansForYourFarm: 'SoilWise AI provides estimated seasonal onset and cessation dates to help you select a crop variety whose maturity cycle fits safely within your rain window.',
    contentSections: [
      {
        title: 'Managing the "False Start" Risk in the Savanna',
        body: 'Early convective showers in late April or early May are common in Kaduna, Kano, and Katsina. Eager farmers who plant immediately often lose their seed when 2 to 3 rainless weeks follow. Agronomists recommend waiting until the seasonal ITD (Inter-Tropical Discontinuity) rain belt has firmly stabilized.',
        callout: {
          type: 'warning',
          text: 'Planting after a false start is the number one cause of costly replanting among smallholder farmers.'
        }
      }
    ],
    knowledgeCheck: {
      question: 'What is a "false start" of the rainy season?',
      options: [
        'When rain falls only at night.',
        'An early isolated rain shower followed by a prolonged dry spell that can kill emerging seedlings.',
        'When hail destroys mature crops before harvest.',
        'When a rainbow appears without rain.'
      ],
      correctIndex: 1,
      explanation: 'A false start occurs when early sporadic rains tempt farmers to plant, only for dry conditions to return, drying out shallow seedlings.'
    },
    relevantWeatherAspects: ['rainfall', 'dry_spells'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'weather-climate-3',
    slug: 'navigating-dry-spells',
    title: 'Navigating Dry Spells & Mid-Season Drought',
    subtitle: 'Protecting your crop when the clouds disappear for two weeks in July or August.',
    topic: 'weather-climate',
    difficulty: 'intermediate',
    estimatedMinutes: 5,
    format: 'practical',
    order: 3,
    summary: 'Mid-season dry spells (7 to 14 days without rain during the vegetative or tasseling stages) can reduce maize and cereal yields by up to 60%. Agronomic defenses reduce this vulnerability.',
    youtubeVideoId: 'VbYmE4v8s9I',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=VbYmE4v8s9I',
    videoTitle: 'Tied Ridges & In-Field Rainwater Harvesting in Semi-Arid Zones',
    keyTakeaways: [
      'Mulching with crop residue or dry grass slows evaporation and keeps root zones moist for up to 10 days longer.',
      'Tied-ridging (creating small earthen dams across furrows every 2 meters) traps every drop of rain in place.',
      'Drought-tolerant varieties developed by IAR/IITA (such as SAMMAZ 15, 16, or 27) roll their leaves to prevent water loss.'
    ],
    practicalAction: 'Construct "Tied Ridges" in your field: every 2 to 3 meters along your furrows, shovel a small mound of dirt to link adjacent ridges. This converts furrows into small holding basins rather than drainage ditches.',
    whatThisMeansForYourFarm: 'Our climate analysis estimates the longest dry spell frequency for your coordinates so you can decide if tied-ridging or mulching is critical for your plot.',
    contentSections: [
      {
        title: 'The Tasseling and Silking Vulnerability Window',
        body: 'Maize is most vulnerable to drought during flowering (tasseling and silking). If soil moisture fails during these two critical weeks, pollen sheds while silks remain unfertilized, leading to empty cobs. By staggering planting dates across fields, you reduce the risk of your entire crop hitting flowering during a dry spell.',
        bulletPoints: [
          'Tied Ridges: Increases in-field water harvesting by up to 40%.',
          'Organic Mulch: Decreases soil surface temperature by 5–8°C, dramatically reducing evaporation.',
          'Weeding: Weeds drink moisture faster than crops; weed thoroughly before dry spells arrive.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'What is the purpose of "tied-ridging" on a rainfed farm?',
      options: [
        'To prevent cows from walking through the farm.',
        'To create small basins that trap rainwater in place instead of letting it run off.',
        'To keep crops warm at night.',
        'To eliminate the need for planting seeds.'
      ],
      correctIndex: 1,
      explanation: 'Tied ridging creates micro-reservoirs along furrows, ensuring all rainfall infiltrates deeply into the root zone instead of draining away.'
    },
    relevantWeatherAspects: ['dry_spells', 'rainfall'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },

  // 4. CROP SUITABILITY
  {
    id: 'crop-suitability-1',
    slug: 'matching-crops-to-soil-ph-and-nutrients',
    title: 'Why Soil Properties Dictate Crop Selection',
    subtitle: 'Planting the wrong crop on the wrong soil guarantees low yields.',
    topic: 'crop-suitability',
    difficulty: 'foundational',
    estimatedMinutes: 5,
    format: 'guide',
    order: 1,
    summary: 'Each crop has distinct physiological limits for soil acidity, drainage, and nutrient demands. Understanding these limits prevents investing in crops destined to struggle.',
    youtubeVideoId: 'q6hV3aC8lBo',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=q6hV3aC8lBo',
    videoTitle: 'Matching Crops to Soil Types, pH and Soil Nutrient Availability',
    keyTakeaways: [
      'Maize is a heavy feeder requiring high nitrogen and moderate pH (5.8–7.0).',
      'Cassava and cowpea tolerate poorer, slightly acidic soils (pH 5.0–6.5) and lower fertility.',
      'Groundnuts fix their own nitrogen but require adequate calcium and phosphorus for pod filling ("pops" or empty pods occur with low calcium).'
    ],
    practicalAction: 'Review the Crop Recommendation section on your Farm Analysis page. Check the "Soil Fit" and "Climate Fit" score before purchasing seed varieties.',
    whatThisMeansForYourFarm: 'SoilWise AI uses multi-parameter scoring that cross-references your soil pH, texture, organic matter, and rainfall duration against IAR/IITA crop requirement databases.',
    contentSections: [
      {
        title: 'Crop Tolerance Comparison Matrix',
        body: 'Here is how major staple crops compare across West African soil conditions:',
        bulletPoints: [
          'Maize: High N & P demand, sensitive to acidity (pH < 5.5 causes stunted yellow plants). Needs well-drained loam.',
          'Sorghum: Deep root system, tolerant to temporary drought and moderate acidity (pH 5.5–7.5).',
          'Cowpea (Beans): Fixes nitrogen from the air, thrives in sandy loam, sensitive to waterlogged clay.',
          'Soybean: High phosphorus requirement, sensitive to low pH; benefits greatly from Rhizobium inoculant.',
          'Cassava: Extremely hardy on acidic, low-fertility soils; susceptible to rotting in heavy waterlogged clay.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'Which of the following crops is most tolerant of low-fertility, slightly acidic soils?',
      options: [
        'Commercial Hybrid Maize',
        'Cassava',
        'Irish Potato',
        'Sweet Corn'
      ],
      correctIndex: 1,
      explanation: 'Cassava possesses deep exploratory roots and mycorrhizal associations that allow it to extract nutrients and produce carbohydrates in soils where maize would fail.'
    },
    relevantSoilProperties: ['ph', 'nitrogen', 'phosphorus', 'potassium'],
    relevantCrops: ['Maize', 'Sorghum', 'Cowpea', 'Cassava', 'Soybean'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'crop-suitability-2',
    slug: 'water-requirements-and-season-duration',
    title: 'Water Requirements & Season Duration',
    subtitle: 'Ensuring your crop finishes before the rains stop in October.',
    topic: 'crop-suitability',
    difficulty: 'intermediate',
    estimatedMinutes: 5,
    format: 'guide',
    order: 2,
    summary: 'Planting a 120-day maize variety in a zone where the rainy season only lasts 90 days causes the crop to dry up while grains are still milk-stage, destroying yield.',
    youtubeVideoId: 'x1M4yF5s7a8',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=x1M4yF5s7a8',
    videoTitle: 'Crop Maturity Classes & Rainy Season Duration in the Savanna',
    keyTakeaways: [
      'Always select crop varieties whose "days to physiological maturity" are at least 15–20 days shorter than your total expected rainy season duration.',
      'In the Sudan/Sahel zones (Kano, Sokoto, Katsina), choose extra-early (75–85 day) or early (90–100 day) varieties.',
      'In the Southern Guinea savanna (Kaduna, Niger, Benue), medium and late varieties (110–125 days) can be planted for maximum biomass and yield.'
    ],
    practicalAction: 'Check the "Estimated Season Duration" card on your Farm Analysis report, and compare it with the seed packet maturity label before purchasing seed.',
    whatThisMeansForYourFarm: 'SoilWise AI automatically checks your location’s expected cessation date against the growth cycle of recommended crop varieties to avoid terminal drought losses.',
    contentSections: [
      {
        title: 'IAR Certified Variety Classifications',
        body: 'The Institute for Agricultural Research (IAR) Zaria has bred crop varieties specifically tailored to rainfall zones:',
        bulletPoints: [
          'Extra-Early (75–80 days): SAMMAZ 16, SAMMAZ 24 (Ideal for short rain zones or late planting).',
          'Early (90–95 days): SAMMAZ 15, SAMMAZ 27 (Drought tolerant, excellent for Sudan savanna).',
          'Medium-Late (110–120 days): SAMMAZ 14, SAMMAZ 17 (High yielding, suitable for Guinea savanna with 130+ rain days).'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'If your farm has an estimated rainy season duration of 100 days, which maize variety is safest to plant?',
      options: [
        'A 130-day late maturing variety.',
        'An 80-to-90 day early maturing variety.',
        'A variety with unknown maturity requirements.',
        'A variety that requires 6 months of rain.'
      ],
      correctIndex: 1,
      explanation: 'An 80–90 day variety finishes grain filling and matures before the seasonal rains cease, protecting you from late-season terminal drought.'
    },
    relevantWeatherAspects: ['rainfall', 'dry_spells'],
    relevantCrops: ['Maize', 'Sorghum', 'Cowpea', 'Millet'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },

  // 5. SUSTAINABLE SOIL MANAGEMENT
  {
    id: 'sustainable-management-1',
    slug: 'integrated-soil-fertility-management',
    title: 'Integrated Soil Fertility Management (ISFM)',
    subtitle: 'The gold standard: combining organic manure, mineral fertilizer, and improved seed.',
    topic: 'sustainable-management',
    difficulty: 'intermediate',
    estimatedMinutes: 6,
    format: 'practical',
    order: 1,
    summary: 'ISFM is a scientifically proven approach that combines modest amounts of mineral fertilizer with organic amendments, improved crop varieties, and local soil knowledge to maximize yield per naira invested.',
    youtubeVideoId: 'fV2sT4qP8wY',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=fV2sT4qP8wY',
    videoTitle: 'Fertilizer Micro-Dosing & ISFM for Smallholders in West Africa',
    keyTakeaways: [
      'Micro-dosing (applying a bottle-cap of fertilizer precisely near the seed) provides high returns at low input cost.',
      'Organic manure improves soil water retention so mineral fertilizer does not burn the roots.',
      'Rotating with nitrogen-fixing grain legumes leaves behind 20–40 kg of free natural nitrogen for the next season.'
    ],
    practicalAction: 'Practice Fertilizer Micro-dosing: Use a cleaned crown bottle cap (or 3-finger pinch, about 4 grams) of NPK 15:15:15 placed 5 cm beside and below the seedling at 10 days after planting, then cover with soil.',
    whatThisMeansForYourFarm: 'SoilWise AI recommendations follow ISFM principles, balancing mineral fertilizer advice with organic management rather than pushing unaffordable blanket rates.',
    contentSections: [
      {
        title: 'The Three Components of ISFM',
        body: 'Decades of research across West Africa by IITA and AGRA proved that farmers achieve the highest return on investment when three elements work together:',
        bulletPoints: [
          '1. Improved Seed: High-germination, disease-resistant seed varieties adapted to the agro-ecology.',
          '2. Fertilizer Micro-Dosing: Targeted placement rather than broadcasting over whole fields.',
          '3. Organic Matter: Animal manure, compost, or crop residue mulching to feed soil biology.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'What is the primary advantage of fertilizer micro-dosing over traditional broadcasting?',
      options: [
        'It requires ten times more fertilizer.',
        'It places a precise, small amount of nutrient directly where seedling roots can reach it, cutting fertilizer costs by up to 50%.',
        'It prevents the crop from growing too fast.',
        'It removes weeds automatically.'
      ],
      correctIndex: 1,
      explanation: 'Micro-dosing places concentrated nutrition right at the seedling root zone rather than scattering expensive fertilizer where weeds will consume it.'
    },
    relevantSoilProperties: ['nitrogen', 'phosphorus', 'potassium', 'organic_carbon'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'sustainable-management-2',
    slug: 'managing-acid-soils-with-lime',
    title: 'Managing Acid Soils with Agricultural Lime & Ash',
    subtitle: 'How to heal sour, acidic soils and reclaim fertilizer efficiency.',
    topic: 'sustainable-management',
    difficulty: 'advanced',
    estimatedMinutes: 6,
    format: 'guide',
    order: 2,
    summary: 'When soil pH drops below 5.2, applying agricultural lime (calcium carbonate) or wood ash neutralizes toxic aluminum and restores nutrient uptake.',
    youtubeVideoId: 'jK5b3w6e2YQ',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=jK5b3w6e2YQ',
    videoTitle: 'Correcting Soil Acidity with Agricultural Lime & Organic Ash',
    keyTakeaways: [
      'Agricultural lime reacts slowly; it should be broadcast and incorporated into the soil 4 to 8 weeks before planting.',
      'Lime is not fertilizer; it is a soil conditioner that unlocks fertilizers already present in the ground.',
      'Dry hardwood cooking ash from kitchens can be used by smallholders as an accessible, localized alternative to commercial lime.'
    ],
    practicalAction: 'If your soil pH is between 4.8 and 5.4, apply 500 kg to 1 ton per hectare of agricultural lime or screened wood ash. Spread it evenly during initial land plowing so it mixes into the top 15 cm.',
    whatThisMeansForYourFarm: 'When SoilWise AI detects acidic soil conditions, liming advice is prioritized because without correcting pH, 50% of your NPK fertilizer will be wasted.',
    contentSections: [
      {
        title: 'How Lime Heals Acidic Soils',
        body: 'Agricultural lime is ground limestone (calcium carbonate, CaCO3). When mixed with moist soil, carbonate ions react with acidic hydrogen and aluminum ions, converting them into harmless water and carbon dioxide while releasing calcium into the soil matrix.',
        bulletPoints: [
          'Rate: Typically 1.0 to 1.5 tons/hectare for sandy loam; 2.0+ tons/hectare for heavier clay soils.',
          'Lifespan: A proper liming application lasts 3 to 5 years before requiring a booster.',
          'Wood Ash: Contains potassium, magnesium, and calcium carbonate with a liming value roughly 30–50% of commercial agricultural lime.'
        ]
      }
    ],
    knowledgeCheck: {
      question: 'When should agricultural lime be applied to acidic farmland?',
      options: [
        'During harvest right before the combine arrives.',
        'At least 4 to 8 weeks before planting, thoroughly mixed into the topsoil during land preparation.',
        'Mixed directly with seed in the seed planter.',
        'Sprayed onto crop leaves in the middle of a hot afternoon.'
      ],
      correctIndex: 1,
      explanation: 'Lime requires moisture and time to react with soil acids; incorporating it weeks before planting ensures the root zone is neutralized when delicate young roots emerge.'
    },
    relevantSoilProperties: ['ph', 'phosphorus'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  },
  {
    id: 'sustainable-management-3',
    slug: 'crop-rotation-and-intercropping',
    title: 'Crop Rotation & Legume Intercropping',
    subtitle: 'Harnessing biological nitrogen fixation to cut fertilizer bills.',
    topic: 'sustainable-management',
    difficulty: 'intermediate',
    estimatedMinutes: 5,
    format: 'practical',
    order: 3,
    summary: 'Cereal crops (maize, sorghum, millet) deplete soil nitrogen. Legume crops (cowpea, groundnut, soybean) work with root bacteria to capture nitrogen from the air. Alternating them breaks pest cycles and fertilizes your land naturally.',
    youtubeVideoId: 'h4b8d2w6e9Y',
    youtubeVideoUrl: 'https://www.youtube.com/watch?v=h4b8d2w6e9Y',
    videoTitle: 'N2Africa / IITA: Putting Biological Nitrogen Fixation to Work',
    keyTakeaways: [
      'Rotating cereal crops with legumes adds the equivalent of 1 to 2 bags of Urea per hectare in natural biological nitrogen.',
      'Crop rotation interrupts the life cycle of parasitic Striga weeds (witchweed) and soil-borne fungal pathogens.',
      'Strip intercropping (2 rows of maize alternating with 4 rows of soybean or cowpea) maximizes land equivalent ratio and food security.'
    ],
    practicalAction: 'Never plant maize or sorghum on the exact same plot for three consecutive years. Design a 2-year cycle: Season 1: Maize/Cowpea intercrop; Season 2: Soybean or Groundnut; Season 3: High-yield Maize.',
    whatThisMeansForYourFarm: 'SoilWise AI analyzes your intended crops to suggest compatible legume rotation partners that preserve soil fertility while boosting farm income.',
    contentSections: [
      {
        title: 'The Magic of Biological Nitrogen Fixation',
        body: 'Legume roots form nodules packed with Rhizobia bacteria. These bacteria take nitrogen gas from the atmosphere (which plants cannot use directly) and convert it into ammonium. When the legume crop is harvested and its roots and fallen leaves decompose, that nitrogen feeds the following cereal crop.',
        callout: {
          type: 'tip',
          text: 'Using certified Rhizobium inoculant on soybean seeds costs less than ₦2,500 per hectare and can increase nodulation and grain yield by 25–40%.'
        }
      }
    ],
    knowledgeCheck: {
      question: 'How does planting cowpeas or soybeans benefit the maize crop planted the following season?',
      options: [
        'It dries out the soil completely.',
        'Rhizobia bacteria in legume roots capture atmospheric nitrogen, leaving fertile organic nitrogen in the soil.',
        'It changes maize from yellow to purple.',
        'It removes all stones from the field.'
      ],
      correctIndex: 1,
      explanation: 'Legumes fix free atmospheric nitrogen into the soil, reducing the amount of synthetic mineral nitrogen fertilizer needed for the succeeding cereal crop.'
    },
    relevantSoilProperties: ['nitrogen', 'organic_carbon'],
    relevantCrops: ['Maize', 'Cowpea', 'Soybean', 'Groundnut', 'Sorghum'],
    authorOrg: 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
    reviewDate: '2026-06-15'
  }
];
