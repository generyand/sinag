import type { TourLanguage } from "@/providers/TourProvider";

// Translation content for all tour steps
export interface TourStepTranslation {
  title: string;
  content: string;
}

export type TourTranslations = Record<TourLanguage, TourStepTranslation>;

// Dashboard Tour Translations
export const dashboardTourTranslations = {
  welcome: {
    en: {
      title: "Welcome to SINAG!",
      content:
        "This is your assessment dashboard. Here you can track your progress through the SGLGB assessment process. Let me show you around!",
    },
    fil: {
      title: "Maligayang pagdating sa SINAG!",
      content:
        "Ito ang iyong assessment dashboard. Dito mo maaaring subaybayan ang iyong progreso sa SGLGB assessment process. Hayaan mong ituro ko sa iyo!",
    },
    ceb: {
      title: "Maayong pag-abot sa SINAG!",
      content:
        "Kini ang imong assessment dashboard. Dinhi makita nimo ang imong pag-uswag sa SGLGB assessment process. Ipakita nako kanimo!",
    },
  },
  assessmentProgress: {
    en: {
      title: "Your Overall Progress",
      content:
        "This shows your overall assessment progress as a percentage. The progress bar changes color as you advance through different phases - from drafting to final approval. Hover over the info icon to see what each phase means.",
    },
    fil: {
      title: "Ang Iyong Kabuuang Progreso",
      content:
        "Ipinapakita nito ang iyong kabuuang assessment progress bilang percentage. Nagbabago ang kulay ng progress bar habang umuusad ka sa iba't ibang phase - mula sa drafting hanggang final approval. I-hover ang info icon para makita kung ano ang ibig sabihin ng bawat phase.",
    },
    ceb: {
      title: "Ang Imong Kinatibuk-ang Pag-uswag",
      content:
        "Gipakita dinhi ang imong kinatibuk-ang assessment progress isip percentage. Mag-usab ang kolor sa progress bar samtang mo-uswag ka sa lain-laing yugto - gikan sa drafting hangtod final approval. I-hover ang info icon para makita unsay buot ipasabot sa matag yugto.",
    },
  },
  phaseTimeline: {
    en: {
      title: "Your Assessment Journey",
      content:
        "Your assessment progresses through three phases: Initial Assessment (Phase 1), Table Validation (Phase 2), and the Final Verdict. Each phase must be completed before moving to the next.",
    },
    fil: {
      title: "Ang Iyong Assessment Journey",
      content:
        "Ang iyong assessment ay dumadaan sa tatlong yugto: Initial Assessment (Phase 1), Table Validation (Phase 2), at Final Verdict. Dapat makumpleto ang bawat phase bago lumipat sa susunod.",
    },
    ceb: {
      title: "Ang Imong Assessment Journey",
      content:
        "Ang imong assessment moagi sa tulo ka yugto: Initial Assessment (Phase 1), Table Validation (Phase 2), ug Final Verdict. Kinahanglan makompleto ang matag phase sa dili pa mo-sunod.",
    },
  },
  phase1Section: {
    en: {
      title: "Phase 1: Initial Assessment",
      content:
        "This is where you fill out indicators and upload your Means of Verification (MOVs). Complete all required indicators before submitting for review.",
    },
    fil: {
      title: "Phase 1: Initial Assessment",
      content:
        "Dito mo pupunan ang mga indicator at mag-upload ng iyong Means of Verification (MOVs). Kumpletuhin ang lahat ng required indicators bago mag-submit para sa review.",
    },
    ceb: {
      title: "Phase 1: Initial Assessment",
      content:
        "Dinhi nimo pun-on ang mga indicator ug mag-upload sa imong Means of Verification (MOVs). Kompletohon ang tanang gikinahanglan nga indicators ayha mag-submit para ma-review.",
    },
  },
  completionMetrics: {
    en: {
      title: "Track Your Progress",
      content:
        "This shows how many indicators you have completed out of the total. Aim for 100% completion before submitting!",
    },
    fil: {
      title: "Subaybayan ang Iyong Progreso",
      content:
        "Ipinakikita nito kung ilan na sa mga indicator ang nakumpleto mo. Mag-aim ng 100% completion bago mag-submit!",
    },
    ceb: {
      title: "Subayi ang Imong Pag-uswag",
      content:
        "Gipakita dinhi pila na ang nakompleto nimong indicator. Timan-i nga 100% completion ayha mag-submit!",
    },
  },
  // Note: yearSelector translations removed - YearSelector component only renders when multiple years exist
  submitButton: {
    en: {
      title: "Ready to Submit?",
      content:
        "When all indicators are complete, click this button to submit your assessment for review by the assessor. Make sure everything is correct before submitting!",
    },
    fil: {
      title: "Handa na bang Mag-submit?",
      content:
        "Kapag kumpleto na ang lahat ng indicators, i-click ang button na ito para i-submit ang iyong assessment para ma-review ng assessor. Siguraduhing tama ang lahat bago mag-submit!",
    },
    ceb: {
      title: "Andam na ba Mag-submit?",
      content:
        "Kon kompleto na ang tanang indicators, i-click kini nga button para i-submit ang imong assessment para ma-review sa assessor. Siguradoha nga husto ang tanan ayha mag-submit!",
    },
  },
  navigateToAssessments: {
    en: {
      title: "Let's Fill Out Your Assessment",
      content:
        "Now let's go to the assessments page where you can start filling out your indicators. Click 'Next' to continue!",
    },
    fil: {
      title: "Punan Natin ang Iyong Assessment",
      content:
        "Ngayon pumunta tayo sa assessments page kung saan maaari mong simulan ang pagpuno ng iyong indicators. I-click ang 'Susunod' para magpatuloy!",
    },
    ceb: {
      title: "Pun-on nato ang Imong Assessment",
      content:
        "Karon moadto ta sa assessments page diin makasugod ka pagpuno sa imong mga indicator. I-click ang 'Sunod' para magpadayon!",
    },
  },
} satisfies Record<string, TourTranslations>;

// Assessments Page Tour Translations
export const assessmentsTourTranslations = {
  assessmentHeader: {
    en: {
      title: "Assessment Overview",
      content:
        "This header shows your overall progress at a glance - the number of completed indicators, your completion percentage, and any status updates.",
    },
    fil: {
      title: "Assessment Overview",
      content:
        "Ipinapakita ng header na ito ang iyong kabuuang progreso - ang bilang ng nakumpletong indicators, iyong completion percentage, at anumang status updates.",
    },
    ceb: {
      title: "Assessment Overview",
      content:
        "Kini nga header nagpakita sa imong kinatibuk-ang pag-uswag - ang gidaghanon sa nakompleto nga indicators, imong completion percentage, ug bisan unsang status updates.",
    },
  },
  treeNavigator: {
    en: {
      title: "Browse Indicators",
      content:
        "Use this navigation tree to browse all indicators grouped by Governance Area. Click on any indicator to view and fill out its form.",
    },
    fil: {
      title: "I-browse ang mga Indicator",
      content:
        "Gamitin ang navigation tree na ito para i-browse ang lahat ng indicators na naka-group ayon sa Governance Area. I-click ang anumang indicator para makita at punan ang form nito.",
    },
    ceb: {
      title: "Tan-awa ang mga Indicator",
      content:
        "Gamita kini nga navigation tree para tan-awon ang tanang indicators nga gi-grupo pinaagi sa Governance Area. I-click ang bisan unsang indicator para makita ug pun-on ang form niini.",
    },
  },
  indicatorStatus: {
    en: {
      title: "Completion Status",
      content:
        "Each indicator shows its status: a checkmark means complete, an empty circle means not started, and a partial circle means in progress.",
    },
    fil: {
      title: "Completion Status",
      content:
        "Bawat indicator ay nagpapakita ng status nito: ang checkmark ay kumpleto na, ang empty circle ay hindi pa nasimulan, at ang partial circle ay kasalukuyang ginagawa.",
    },
    ceb: {
      title: "Completion Status",
      content:
        "Matag indicator nagpakita sa status niini: ang checkmark nagpasabot nga kompleto, ang empty circle nagpasabot nga wala pa nagsugod, ug ang partial circle nagpasabot nga gina-ubra pa.",
    },
  },
  contentPanel: {
    en: {
      title: "Indicator Details",
      content:
        "This is where you answer questions and upload evidence for each indicator. The form fields will change based on which indicator you select.",
    },
    fil: {
      title: "Indicator Details",
      content:
        "Dito ka sasagot ng mga tanong at mag-a-upload ng ebidensya para sa bawat indicator. Magbabago ang form fields batay sa indicator na pipiliin mo.",
    },
    ceb: {
      title: "Indicator Details",
      content:
        "Dinhi ka motubag sa mga pangutana ug mag-upload og ebidensya para sa matag indicator. Mag-usab ang form fields base sa indicator nga imong pilion.",
    },
  },
  mobileNavButton: {
    en: {
      title: "Mobile Navigation",
      content:
        "On mobile devices, tap this button to open the indicator navigation drawer. The percentage shows your overall completion progress.",
    },
    fil: {
      title: "Mobile Navigation",
      content:
        "Sa mga mobile device, i-tap ang button na ito para buksan ang indicator navigation drawer. Ang percentage ay nagpapakita ng iyong kabuuang progreso.",
    },
    ceb: {
      title: "Mobile Navigation",
      content:
        "Sa mga mobile device, i-tap kini nga button para ablihan ang indicator navigation drawer. Ang percentage nagpakita sa imong kinatibuk-ang pag-uswag.",
    },
  },
  navigateToIndicator: {
    en: {
      title: "Let's Fill Out an Indicator",
      content:
        "Now let's look at how to fill out an individual indicator form. Click 'Next' to see the indicator form details!",
    },
    fil: {
      title: "Punan Natin ang isang Indicator",
      content:
        "Ngayon tingnan natin kung paano punan ang isang individual indicator form. I-click ang 'Susunod' para makita ang indicator form details!",
    },
    ceb: {
      title: "Pun-on nato ang usa ka Indicator",
      content:
        "Karon tan-awon nato unsaon pagpuno sa usa ka indicator form. I-click ang 'Sunod' para makita ang indicator form details!",
    },
  },
} satisfies Record<string, TourTranslations>;

// Indicator Form Tour Translations
export const indicatorFormTourTranslations = {
  breadcrumb: {
    en: {
      title: "Where You Are",
      content:
        "This breadcrumb shows your current location. Click on any part to navigate back to that level.",
    },
    fil: {
      title: "Nasaan Ka",
      content:
        "Ipinapakita ng breadcrumb na ito ang iyong kasalukuyang lokasyon. I-click ang anumang bahagi para bumalik sa level na iyon.",
    },
    ceb: {
      title: "Asa Ka Karon",
      content:
        "Kini nga breadcrumb nagpakita sa imong kasamtangan nga lokasyon. I-click ang bisan unsang bahin para mobalik sa maong level.",
    },
  },
  technicalNotes: {
    en: {
      title: "DILG Guidelines",
      content:
        "These are the official guidelines from DILG explaining what this indicator measures and how to properly document it.",
    },
    fil: {
      title: "DILG Guidelines",
      content:
        "Ito ang mga opisyal na guidelines mula sa DILG na nagpapaliwanag kung ano ang sinusukat ng indicator na ito at kung paano ito i-document nang tama.",
    },
    ceb: {
      title: "DILG Guidelines",
      content:
        "Kini ang opisyal nga mga guidelines gikan sa DILG nga nagpasabot unsay gisukod sa kini nga indicator ug unsaon kini pag-dokumento sa husto.",
    },
  },
  formFields: {
    en: {
      title: "Answer Questions",
      content:
        "Fill out all required fields in this form. Different indicators have different types of questions - some are yes/no, others need dates or numbers.",
    },
    fil: {
      title: "Sagutin ang mga Tanong",
      content:
        "Punan ang lahat ng required fields sa form na ito. Iba't ibang indicators ay may iba't ibang uri ng tanong - ang ilan ay yes/no, ang iba ay nangangailangan ng dates o numbers.",
    },
    ceb: {
      title: "Tubaga ang mga Pangutana",
      content:
        "Pun-a ang tanang gikinahanglan nga fields sa kini nga form. Lain-laing indicators adunay lain-laing matang sa pangutana - ang uban yes/no, ang uban nagkinahanglan og dates o numbers.",
    },
  },
  movUpload: {
    en: {
      title: "Upload Evidence",
      content:
        "Upload your Means of Verification (MOVs) here. These are documents that prove your answers. Accepted formats include PDF, images, and Office documents.",
    },
    fil: {
      title: "Mag-upload ng Ebidensya",
      content:
        "Mag-upload ng iyong Means of Verification (MOVs) dito. Ito ang mga dokumento na nagpapatunay sa iyong mga sagot. Tinatanggap ang PDF, images, at Office documents.",
    },
    ceb: {
      title: "Mag-upload og Ebidensya",
      content:
        "Mag-upload sa imong Means of Verification (MOVs) dinhi. Kini ang mga dokumento nga nagpamatuod sa imong mga tubag. Dawaton ang PDF, images, ug Office documents.",
    },
  },
  saveButton: {
    en: {
      title: "Save Your Work",
      content:
        "Don't forget to save your progress! Your work is automatically saved when you navigate away, but it's good practice to save manually too.",
    },
    fil: {
      title: "I-save ang Iyong Trabaho",
      content:
        "Huwag kalimutang i-save ang iyong progreso! Awtomatikong nai-save ang iyong trabaho kapag umalis ka, pero maganda ring mag-save nang manual.",
    },
    ceb: {
      title: "I-save ang Imong Trabaho",
      content:
        "Ayaw kalimti pag-save sa imong pag-uswag! Awtomatiko nga ma-save ang imong trabaho kon mobiya ka, pero maayo gihapon mag-save nga manual.",
    },
  },
  tourComplete: {
    en: {
      title: "You're Ready!",
      content:
        "You now know how to navigate and fill out your SGLGB assessment. Return to the dashboard to track your progress and submit when ready. Good luck!",
    },
    fil: {
      title: "Handa Ka Na!",
      content:
        "Alam mo na ngayon kung paano mag-navigate at punan ang iyong SGLGB assessment. Bumalik sa dashboard para subaybayan ang iyong progreso at mag-submit kapag handa na. Good luck!",
    },
    ceb: {
      title: "Andam Ka Na!",
      content:
        "Nahibal-an na nimo unsaon pag-navigate ug pagpuno sa imong SGLGB assessment. Balik sa dashboard para subayon ang imong pag-uswag ug i-submit kon andam na. Good luck!",
    },
  },
} satisfies Record<string, TourTranslations>;

// Rework Tour Translations (shown only when assessment is in REWORK status)
export const reworkTourTranslations = {
  reworkAlert: {
    en: {
      title: "Feedback Received",
      content:
        "The assessor has reviewed your submission and requested some changes. Don't worry - this is a normal part of the process!",
    },
    fil: {
      title: "May Natanggap na Feedback",
      content:
        "Na-review na ng assessor ang iyong submission at may hiningi na mga pagbabago. Huwag mag-alala - normal na bahagi ito ng proseso!",
    },
    ceb: {
      title: "Adunay Nadawat nga Feedback",
      content:
        "Na-review na sa assessor ang imong submission ug nangayo og mga pag-usab. Ayaw kabalaka - normal kini nga bahin sa proseso!",
    },
  },
  aiSummaryPanel: {
    en: {
      title: "AI Summary",
      content:
        "This AI-generated summary gives you a quick overview of what needs to be fixed. It's available in your preferred language.",
    },
    fil: {
      title: "AI Summary",
      content:
        "Ang AI-generated summary na ito ay nagbibigay ng mabilis na overview ng mga kailangang ayusin. Available ito sa iyong preferred language.",
    },
    ceb: {
      title: "AI Summary",
      content:
        "Kini nga AI-generated summary naghatag kanimo og dali nga overview unsay kinahanglan ayohon. Available kini sa imong gusto nga pinulongan.",
    },
  },
  reworkIndicatorsList: {
    en: {
      title: "Indicators to Fix",
      content:
        "These specific indicators need your attention. Only these will be unlocked for editing - others remain as submitted.",
    },
    fil: {
      title: "Mga Indicator na Kailangang Ayusin",
      content:
        "Ang mga partikular na indicators na ito ay nangangailangan ng iyong atensyon. Tanging ang mga ito lang ang maa-unlock para sa editing - ang iba ay mananatiling tulad ng nai-submit.",
    },
    ceb: {
      title: "Mga Indicator nga Kinahanglan Ayohon",
      content:
        "Kini nga mga partikular nga indicators nagkinahanglan sa imong atensyon. Kini ra ang ma-unlock para sa pag-edit - ang uban magpabilin sama sa gi-submit.",
    },
  },
  priorityActions: {
    en: {
      title: "Priority Actions",
      content:
        "Start with these items first - they're ordered by importance. Completing them in order will help you work more efficiently.",
    },
    fil: {
      title: "Priority Actions",
      content:
        "Simulan mo muna ang mga items na ito - naka-order ang mga ito ayon sa kahalagahan. Ang pagkumpleto nito ayon sa order ay tutulong sa iyo na magtrabaho nang mas epektibo.",
    },
    ceb: {
      title: "Priority Actions",
      content:
        "Sugdi pag-una kini nga mga items - gi-order kini pinaagi sa pagka-importante. Ang pagkompleto niini pinaagi sa order makatabang nimo magtrabaho nga mas episyente.",
    },
  },
  startFixingButton: {
    en: {
      title: "Start Fixing",
      content:
        "Click this button to jump directly to the first indicator that needs attention. You're ready to make your fixes!",
    },
    fil: {
      title: "Simulan ang Pag-ayos",
      content:
        "I-click ang button na ito para direktang pumunta sa unang indicator na nangangailangan ng atensyon. Handa ka nang mag-ayos!",
    },
    ceb: {
      title: "Sugdi Pag-ayo",
      content:
        "I-click kini nga button para direkta nga moadto sa unang indicator nga nagkinahanglan og atensyon. Andam ka na magsugod pag-ayo!",
    },
  },
} satisfies Record<string, TourTranslations>;

// Helper function to get translation for a step
export function getStepTranslation(
  translations: TourTranslations,
  language: TourLanguage
): TourStepTranslation {
  return translations[language];
}
