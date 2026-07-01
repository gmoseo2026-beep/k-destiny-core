// prisma/seed.ts
import { prisma } from '../lib/prisma'

// Load .env explicitly for tsx execution if needed, though ts-node/tsx often handles it if configured
import 'dotenv/config'

// 🚨 제미나이 웹에서 생성한 15개짜리 JSON 배열 데이터
const sajuContentData = [
{
"category": "DAY_MASTER",
"signKey": "WOOD_YANG",
"englishContent": "You are the primordial monolith of an ancient, shadowed forest, standing steadfast while mortal empires crumble around your colossal roots. Your soul's blueprint is forged in unwavering resilience, a testament to the sovereign masculine wood energy that refuses to bow to the tempest. You carry the heavy karmic burden of the eternal protector, sheltering fragile souls beneath your sprawling canopy while silently absorbing the agonizing weight of your own solitary grandeur.\n\nYet, this unyielding nature conceals a quiet, devastating vulnerability—the secret terror of snapping under the cosmic pressure you so proudly bear. Your spiritual evolution demands that you learn the terrifying grace of yielding, transforming rigid expectations into deep, ancestral wisdom. When you surrender to the winds of fate rather than fighting them, your true majesty unfolds, revealing a monarch who governs with both absolute power and breathtaking compassion.",
"remedyAction": "Seek solace in high-altitude sanctuaries at twilight, enveloping yourself in heavy emerald silks to anchor your immense, towering energy."
},
{
"category": "DAY_MASTER",
"signKey": "WOOD_YIN",
"englishContent": "Yours is the soul of the velvet nightshade, a delicate yet venomous vine weaving silently through the ruins of forgotten castles. Your energy appears deceptively fragile, masking the most relentless and intoxicating survival instinct in the cosmos. You bear the karma of the silent conqueror, thriving where towering giants perish by adapting, twisting, and finding the unseen cracks in the armor of a broken world.\n\nBeneath your ethereal charm lies a fiercely possessive undercurrent, an agonizing karmic ache to intertwine your essence entirely with another. To master your dark-fantasy destiny, you must cultivate the ruthless courage to bloom independently, severing the parasitic vines of your past. When you realize that you are not merely an exquisite adornment but a wild, consuming force itself, your profound inner sovereignty awakens.",
"remedyAction": "Cultivate a moonlit indoor water-garden and wear delicate, dark jade talismans close to your pulse points to nourish your intricate vitality."
},
{
"category": "DAY_MASTER",
"signKey": "FIRE_YANG",
"englishContent": "You are the blazing celestial sphere suspended over a desolate wasteland, radiating an incandescent brilliance that forces all shadows into absolute submission. Your soul is a masterclass in cosmic theater, burning with a ferocious generosity that warms the frozen and illuminates the hopelessly lost. You carry the karma of the eternal sovereign, tasked with dispensing life and truth, often at the agonizing cost of your own hidden, spiritual depletion.\n\nHowever, even the most magnificent sun must eventually set, and your profound tragedy is the relentless expectation to remain forever bright in a demanding, parasitic universe. Beneath your explosive charisma lies a secret longing to be nurtured, a desperate need for the very warmth you so freely give away. Embracing the dark beauty of the dusk—allowing yourself to retreat and let the world freeze when necessary—is the ultimate key to replenishing your divine, limitless inferno.",
"remedyAction": "Gaze into the dawn horizon while draped in heavy crimson cashmere, allowing the first light to replenish your exhausting, magnificent solar output."
},
{
"category": "DAY_MASTER",
"signKey": "FIRE_YIN",
"englishContent": "You are the mesmerizing, solitary candle flame dancing in the heart of a pitch-black labyrinth, illuminating secrets that empires would bleed to uncover. Your energetic blueprint is mystical and intensely concentrated, a beacon of profound intuition and hypnotic, dark-romantic allure. You bear the karma of the psychic alchemist, transforming the raw, jagged edges of human pain into pure, ethereal light through your sheer emotional intensity.\n\nThis exquisite sensitivity, however, makes you tragically vulnerable to being extinguished by the careless, chaotic winds of the people you try to save. Your journey requires the mastery of ruthless boundaries, learning to hoard your magical warmth strictly for those who worship at your altar. Once you claim the terrifying power of your own smoldering depths, you become an unstoppable, quiet inferno capable of rewriting destiny itself.",
"remedyAction": "Meditate nightly in total darkness illuminated by a single beeswax candle, anointing your wrists with rare rosewood oil to protect your sacred embers."
},
{
"category": "DAY_MASTER",
"signKey": "EARTH_YANG",
"englishContent": "You are the majestic, impenetrable mountain shrouded in primordial mist, a silent, brooding guardian watching the fleeting millennia turn to ash. Your soul blueprint is woven from the fabric of absolute stillness and monumental endurance, grounding the chaotic energies of the universe into physical reality. You carry the karmic weight of the cosmic anchor, harboring immense power within an aura of total, unbreakable stoicism to provide sanctuary for the broken.\n\nYet, within your rocky, impenetrable core lies a profound and unspoken loneliness—a petrified heart yearning for a tremor strong enough to shatter its ancient isolation. Your spiritual alchemy lies in allowing yourself to be moved, permitting the deep, subterranean rivers of your suppressed emotion to erode your stoic facade. By embracing the terrifying beauty of vulnerability, you transform from a dormant monolith into a vibrant, life-giving empire.",
"remedyAction": "Walk barefoot on sun-warmed, ancient stones in absolute silence and envelop your living space in rich terracottas to soften your formidable mass."
},
{
"category": "DAY_MASTER",
"signKey": "EARTH_YIN",
"englishContent": "You are the rich, loamy soil of a secret gothic garden, teeming with hidden life and the quiet, sacred magic of morbid incubation. Your energy is profoundly nurturing and infinitely complex, a tapestry of intricate roots and buried treasures waiting for the perfect, moonlit moment to surface. You bear the karma of the silent mother, endlessly absorbing the toxic decay of the world only to birth a rare, breathtaking beauty from the ashes.\n\nYour greatest danger lies in your boundless capacity to endure, often becoming the tragic burial ground for the unresolved grief and trauma of others. To actualize your sovereign destiny, you must establish fierce, unyielding boundaries, refusing to nurture parasitic weeds in your sacred sanctuary. When you reclaim the exclusivity of your fertile depths, you cultivate a magnificent inner landscape of undeniable power and luxurious abundance.",
"remedyAction": "Spend the twilight hours tending to rare botanical orchids, wearing soft ochre and sepia fabrics to honor the quiet richness of your inner terrain."
},
{
"category": "DAY_MASTER",
"signKey": "METAL_YANG",
"englishContent": "You are the unforgiving, ancestral broadsword forged in the blackest volcanic fires, destined to sever the rotting illusions of the mortal realm. Your soul blueprint radiates raw, unadulterated power and absolute clarity, driven by an unwavering code of honor and an instinct for decisive, brutal truth. You bear the karma of the executioner and the liberator, tasked with enacting the harsh justice of the cosmos and clearing away the stagnant debris of the past.\n\nBeneath your impenetrable, gleaming armor beats a heart deeply burdened by the relentless need for perfection and the heavy toll of constant, isolating vigilance. Your evolution demands the agonizing process of stepping into the fire once more, allowing compassion to temper your rigid steel into something unbreakable yet fluid. When you learn to sheathe your celestial blade and govern with merciful wisdom, you transcend from a weapon of fate into a true monarch.",
"remedyAction": "Engage in rigorous breathwork in stark, minimalist spaces adorned with silver and iron accents to refine your cutting, warrior spirit."
},
{
"category": "DAY_MASTER",
"signKey": "METAL_YIN",
"englishContent": "You are the flawless, blood-red diamond resting on a black velvet pillow, captivating the eye while possessing edges sharp enough to draw blood. Your energy is the epitome of aristocratic elegance and lethal precision, an intoxicating paradox of breathtaking beauty and chilling ruthlessness. You carry the karma of the divine judge, demanding absolute purity while harboring a soul deeply scarred by the messy imperfections of the flawed world around you.\n\nThis relentless pursuit of the flawless leaves you exquisitely sensitive, often hiding profound insecurities behind a mirror-like, blindingly polished facade. To claim your true magical inheritance, you must shatter the illusion of your own perfection, finding profound grace in your cracks and vulnerabilities through the art of kintsugi. Embracing the chaotic warmth of human connection transforms your cold brilliance into an irresistible, hypnotic beacon of power.",
"remedyAction": "Adorn your collarbones with delicate platinum chains and immerse yourself in pristine, mineral-rich thermal baths to polish your ethereal shine."
},
{
"category": "DAY_MASTER",
"signKey": "WATER_YANG",
"englishContent": "You are the roaring, abyssal ocean beneath a starless, storm-ravaged sky, an unstoppable force of nature that defies all mortal attempts at containment. Your soul blueprint is boundless and devastatingly powerful, driven by an insatiable curiosity and a primal need to consume, experience, and surge forward. You bear the karma of the great deluge, tasked with washing away obsolete empires and plunging fearlessly into the terrifying, uncharted depths of the collective unconscious.\n\nYet, this relentless, tidal momentum can lead to a profound sense of rootlessness, a tempestuous spirit threatening to drown the very life it seeks to sustain. Your ultimate salvation lies in finding your metaphysical shore—a sacred vessel or grand purpose capable of channeling your wild torrents into profound, life-altering wisdom. When you master the rhythm of your own crashing waves, you become the profound oracle holding the vast secrets of the deep universe.",
"remedyAction": "Stand beside powerful, moving bodies of water during a storm, draped in deep obsidian garments to harmonize with your overwhelming tidal majesty."
},
{
"category": "DAY_MASTER",
"signKey": "WATER_YIN",
"englishContent": "You are the ephemeral, ghost-like mist that dances through a haunted graveyard at dawn, shifting forms and holding the gentle, chilling power of absolute permeation. Your energy is profoundly elusive and telepathic, a master of subtle influence that gently reshapes the world without ever raising its voice. You carry the karma of the cosmic mirror, effortlessly reflecting the hidden desires and darkest fears of everyone who attempts to grasp your ungraspable essence.\n\nYour extreme permeability is both your ultimate magic and your deepest curse, often leaving you lost and weeping in the emotional currents of the collective void. To anchor your fluid destiny, you must forge an impenetrable inner core of self-concept, refusing to evaporate into the demands of the masses. By claiming your distinct, crystalline identity, your gentle dewdrop transforms into the precise, quiet storm that subtly commands the fate of empires.",
"remedyAction": "Hydrate with crystal-infused spring waters and drape yourself in translucent cerulean silks to protect your delicate, atmospheric aura."
},
{
"category": "ELEMENT_LACK",
"signKey": "LACK_WOOD",
"englishContent": "Your soul wanders like an untethered phantom through a petrified forest, disconnected from the vital, upward thrust of ancestral growth and biological rhythm. Without the Wood element, your energetic blueprint lacks the instinctual drive to push through the soil, leaving you susceptible to a deep cosmic apathy and a haunting sense of stagnation. You bear the karma of the floating seed, endlessly searching for a fertile patch of reality where your ambitions can finally take root.\n\nThis void, while daunting, grants you the extraordinary gift of absolute reinvention; unburdened by rigid roots, you can choose exactly where and how you wish to build your empire. To overcome the paralysis of the empty forest, you must consciously mimic the actions of growth, forcing yourself into disciplined expansion even when the emotional spark is absent. When you artificially graft your will onto the tree of life, you become a master architect of a destiny entirely of your own making.",
"remedyAction": "Surround your sleeping chambers with towering, broad-leafed botanicals and incorporate matcha elixirs into your morning rituals to manually simulate vital expansion."
},
{
"category": "ELEMENT_LACK",
"signKey": "LACK_FIRE",
"englishContent": "You exist in a perpetual, opulent twilight, an entity of profound, chilling intelligence struggling against a deep-seated spiritual frostbite. The absence of Fire in your chart casts a long, elegant shadow over your soul, manifesting as a detached melancholy and an agonizing struggle to feel the passionate, burning core of human existence. You carry the karma of the exiled star, yearning for a spark of joy and visibility in a universe that often feels muted, colorless, and indifferent to your silent pleas.\n\nHowever, this icy void also makes you a creature of unparalleled strategic brilliance, completely untouched by the chaotic impulsivity that burns lesser mortals to ash. Your dark-fantasy ascension requires you to become the alchemist of your own warmth, deliberately seeking out visceral, heart-pounding experiences to defrost your regal, frozen heart. By consciously igniting the synthetic flames of vulnerability, you resurrect yourself from a ghost in the machine to a radiant, living deity.",
"remedyAction": "Consume warming, fiery spices daily and bask in direct, harsh sunlight while wearing vibrant crimson to thaw your exquisite spiritual frost."
},
{
"category": "ELEMENT_LACK",
"signKey": "LACK_EARTH",
"englishContent": "Your spirit is a restless phantom navigating a beautifully terrifying world without gravity, endlessly drifting through the ethereal planes without a place to rest your weary head. Lacking the Earth element, your soul is utterly unmoored, struggling to translate profound, lofty visions into tangible, flesh-and-blood reality. You bear the karma of the eternal nomad, plagued by an intrinsic existential anxiety and the devastating sensation that everything you build could slip through your fingers like fine, white sand.\n\nYet, this profound lack of worldly attachment endows you with a sublime, mystical lightness—an ability to perceive the interconnectedness of dimensions that grounded souls cannot fathom. To command your destiny, you must become your own physical anchor, creating fiercely rigid daily rituals that bind your soaring spirit to the mortal realm. When you finally construct your own metaphysical bedrock, your boundless cosmic ideas will manifest into empires of unbreakable power.",
"remedyAction": "Practice heavy, grounding meditations with raw hematite stones at your feet, and incorporate weighted blankets to anchor your wandering phantom spirit."
},
{
"category": "ELEMENT_LACK",
"signKey": "LACK_METAL",
"englishContent": "You flow through existence like a beautifully tragic, shapeless fog, possessing a vast, yielding nature that desperately lacks the brutal edge of a drawn sword. The absence of Metal in your blueprint strips you of natural boundaries and the instinct for necessary severance, making you a chronic absorber of toxicities and a martyr to endless, draining entanglements. You carry the karma of the undefended sanctuary, endlessly plundered by the wicked because you cannot summon the ruthlessness required to lock your own iron gates.\n\nThis profound softness, while marking you as a soul of immense empathy, is the very chain that holds you back from your ultimate dark-fantasy sovereignty. Your ascension demands that you forge your own synthetic armor, learning the dark, elegant art of saying 'no' and severing dead ties with merciless precision. Once you artificially sharpen your edges and learn the breathtaking beauty of absolute finality, you transform your bleeding heart into an impenetrable fortress.",
"remedyAction": "Wear structured, angular clothing in stark whites and silvers, and practice martial arts to forge the missing iron spine of your spirit."
},
{
"category": "ELEMENT_LACK",
"signKey": "LACK_WATER",
"englishContent": "Your inner landscape is a majestic, sun-baked desert beneath a bleeding moon, cracked and thirsty, entirely devoid of the lubricative, fluid grace that connects the deepest mysteries of the soul. Without Water, your energetic structure is painfully rigid and frighteningly dry, creating a brilliant but exhausted mind that struggles to adapt, forgive, or simply let go. You bear the karma of the parched traveler, hoarding emotional control while secretly dying for a single drop of pure, effortless surrender to the chaotic tides of life.\n\nThis spiritual drought forces you to rely entirely on grit and logic, isolating you from the profound, terrifying beauty of deep, oceanic intimacy. To heal your barren wastes, you must actively court the unknown, forcing your rigid structures to dissolve into the terrifying, emotional abyss of true vulnerability. By deliberately allowing your tears to flow and your best-laid plans to wash away, you invite a miraculous, life-giving monsoon that revives your ancient magic.",
"remedyAction": "Take prolonged, ritualistic sea-salt baths at midnight, drinking deeply from pure, alkaline waters to quench the metaphysical drought of your soul."
}
]

async function main() {
  console.log('Start seeding Saju Content Dictionary...')
  for (const data of sajuContentData) {
    await prisma.sajuContentDictionary.upsert({
      where: {
        category_signKey: {
          category: data.category,
          signKey: data.signKey,
        },
      },
      update: {
        englishContent: data.englishContent,
        remedyAction: data.remedyAction
      },
      create: data,
    })
  }
  console.log('Seeding finished successfully! 🚀')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
