-- ═══════════════════════════════════════════════════════════════
-- SHIFTING SOURCE — Migration 025
-- GDPR & NIS2-compliant Privacy Policy and Terms of Service
-- Multi-language content (da/en/se) as page_sections
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Clean existing privacy and terms sections to avoid duplicates
DELETE FROM page_sections WHERE page IN ('privacy', 'terms');

-- ═══════════════════════════════════════════════════════════════
-- PRIVACY POLICY
-- ═══════════════════════════════════════════════════════════════

-- 1. Data Controller & Introduction
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 1, true, '{
  "title": {
    "da": "1. Dataansvarlig",
    "en": "1. Data Controller",
    "se": "1. Personuppgiftsansvarig"
  },
  "text": {
    "da": "Shifting Source (\"vi\", \"os\", \"vores\") er dataansvarlig for behandlingen af dine personoplysninger i henhold til Europa-Parlamentets og Rådets forordning (EU) 2016/679 (GDPR) samt NIS2-direktivet (EU) 2022/2555.\n\nKontakt vedrørende databeskyttelse:\nE-mail: privacy@shiftingsource.com\nHjemmeside: shiftingsource.com\n\nDenne privatlivspolitik beskriver, hvordan vi indsamler, behandler, opbevarer og beskytter dine personoplysninger, når du bruger vores hjemmeside og tjenester.",
    "en": "Shifting Source (\"we\", \"us\", \"our\") is the data controller for the processing of your personal data in accordance with Regulation (EU) 2016/679 (GDPR) and the NIS2 Directive (EU) 2022/2555.\n\nData protection contact:\nEmail: privacy@shiftingsource.com\nWebsite: shiftingsource.com\n\nThis privacy policy describes how we collect, process, store, and protect your personal data when you use our website and services.",
    "se": "Shifting Source (\"vi\", \"oss\", \"vår\") är personuppgiftsansvarig för behandlingen av dina personuppgifter i enlighet med Europaparlamentets och rådets förordning (EU) 2016/679 (GDPR) samt NIS2-direktivet (EU) 2022/2555.\n\nKontakt gällande dataskydd:\nE-post: privacy@shiftingsource.com\nWebbplats: shiftingsource.com\n\nDenna integritetspolicy beskriver hur vi samlar in, behandlar, lagrar och skyddar dina personuppgifter när du använder vår webbplats och våra tjänster."
  }
}'::jsonb);

-- 2. Legal Basis for Processing
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 2, true, '{
  "title": {
    "da": "2. Retsgrundlag for behandling",
    "en": "2. Legal Basis for Processing",
    "se": "2. Rättslig grund för behandling"
  },
  "text": {
    "da": "Vi behandler dine personoplysninger på følgende retsgrundlag (GDPR art. 6):\n\nSamtykke (art. 6, stk. 1, litra a): Nyhedsbrev, markedsføring, cookies til analyse.\n\nKontraktopfyldelse (art. 6, stk. 1, litra b): Levering af coaching-tjenester, kostplaner, brugerkonti.\n\nBerettiget interesse (art. 6, stk. 1, litra f): Platformsikkerhed, svindelforebyggelse, fejlrettelse, forbedring af tjenester.\n\nRetlig forpligtelse (art. 6, stk. 1, litra c): Bogføring, skatteindberetning, myndighedsanmodninger.\n\nDu kan til enhver tid trække dit samtykke tilbage via din profilside eller ved at kontakte os.",
    "en": "We process your personal data on the following legal bases (GDPR Art. 6):\n\nConsent (Art. 6(1)(a)): Newsletter, marketing, analytics cookies.\n\nPerformance of contract (Art. 6(1)(b)): Delivery of coaching services, meal plans, user accounts.\n\nLegitimate interest (Art. 6(1)(f)): Platform security, fraud prevention, bug fixes, service improvement.\n\nLegal obligation (Art. 6(1)(c)): Accounting, tax reporting, authority requests.\n\nYou may withdraw your consent at any time via your profile page or by contacting us.",
    "se": "Vi behandlar dina personuppgifter på följande rättsliga grunder (GDPR art. 6):\n\nSamtycke (art. 6.1 a): Nyhetsbrev, marknadsföring, analyskakor.\n\nFullgörande av avtal (art. 6.1 b): Leverans av coachingtjänster, kostplaner, användarkonton.\n\nBerättigat intresse (art. 6.1 f): Plattformssäkerhet, bedrägeriförebyggande, buggfixar, tjänsteförbättring.\n\nRättslig förpliktelse (art. 6.1 c): Bokföring, skatterapportering, myndighetsförfrågningar.\n\nDu kan när som helst återkalla ditt samtycke via din profilsida eller genom att kontakta oss."
  }
}'::jsonb);

-- 3. Categories of Personal Data
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 3, true, '{
  "title": {
    "da": "3. Kategorier af personoplysninger",
    "en": "3. Categories of Personal Data",
    "se": "3. Kategorier av personuppgifter"
  },
  "text": {
    "da": "Vi indsamler og behandler følgende kategorier af personoplysninger:\n\nKontaktoplysninger: Navn, e-mailadresse, sprog.\n\nKontodata: Brugerprofil, præferencer, login-historik.\n\nSundhedsrelaterede data: Vægt, højde, BMR/TDEE-beregninger, kostpræferencer, faste-data, humør- og energi-målinger (kun coaching-klienter).\n\nTekniske data: IP-adresse (anonymiseret), browser-type, enhedstype, sideoversigt.\n\nKommunikationsdata: E-mail-korrespondance, chat-beskeder med AI-assistent.\n\nBetalingsdata: Håndteres udelukkende af tredjepartsudbydere (vi opbevarer ikke betalingskortoplysninger).\n\nSundhedsdata behandles med ekstra sikkerhedsforanstaltninger i henhold til GDPR art. 9.",
    "en": "We collect and process the following categories of personal data:\n\nContact information: Name, email address, language.\n\nAccount data: User profile, preferences, login history.\n\nHealth-related data: Weight, height, BMR/TDEE calculations, dietary preferences, fasting data, mood and energy measurements (coaching clients only).\n\nTechnical data: IP address (anonymized), browser type, device type, page views.\n\nCommunication data: Email correspondence, chat messages with AI assistant.\n\nPayment data: Handled exclusively by third-party providers (we do not store payment card details).\n\nHealth data is processed with additional security measures in accordance with GDPR Art. 9.",
    "se": "Vi samlar in och behandlar följande kategorier av personuppgifter:\n\nKontaktuppgifter: Namn, e-postadress, språk.\n\nKontodata: Användarprofil, preferenser, inloggningshistorik.\n\nHälsorelaterade data: Vikt, längd, BMR/TDEE-beräkningar, kostpreferenser, fasta-data, humör- och energimätningar (endast coachingklienter).\n\nTekniska data: IP-adress (anonymiserad), webbläsartyp, enhetstyp, sidvisningar.\n\nKommunikationsdata: E-postkorrespondens, chattmeddelanden med AI-assistent.\n\nBetalningsdata: Hanteras uteslutande av tredjepartsleverantörer (vi lagrar inte betalkortsuppgifter).\n\nHälsodata behandlas med extra säkerhetsåtgärder i enlighet med GDPR art. 9."
  }
}'::jsonb);

-- 4. Data Retention
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 4, true, '{
  "title": {
    "da": "4. Opbevaringsperioder",
    "en": "4. Data Retention Periods",
    "se": "4. Lagringsperioder"
  },
  "text": {
    "da": "Vi opbevarer dine personoplysninger så længe det er nødvendigt til formålet:\n\nAktiv konto: Data opbevares så længe din konto er aktiv.\n\nInaktiv konto: Slettes automatisk efter 24 måneder uden aktivitet.\n\nNyhedsbrev-abonnement: Indtil du afmelder dig.\n\nSundhedsdata (coaching): Slettes 12 måneder efter coaching-forløbets afslutning.\n\nBogføringsdata: 5 år (lovkrav).\n\nTekniske logfiler: Maks. 90 dage.\n\nSamtykke-log: 5 år efter samtykke er givet/trukket tilbage (dokumentation).\n\nVed sletning af din konto anonymiserer vi dine data i overensstemmelse med GDPR art. 17 (retten til sletning).",
    "en": "We retain your personal data as long as necessary for its purpose:\n\nActive account: Data is retained while your account is active.\n\nInactive account: Automatically deleted after 24 months of inactivity.\n\nNewsletter subscription: Until you unsubscribe.\n\nHealth data (coaching): Deleted 12 months after the coaching engagement ends.\n\nAccounting data: 5 years (legal requirement).\n\nTechnical log files: Maximum 90 days.\n\nConsent records: 5 years after consent is given/withdrawn (documentation).\n\nWhen you delete your account, we anonymize your data in accordance with GDPR Art. 17 (right to erasure).",
    "se": "Vi behåller dina personuppgifter så länge det är nödvändigt för ändamålet:\n\nAktivt konto: Data behålls så länge ditt konto är aktivt.\n\nInaktivt konto: Raderas automatiskt efter 24 månader utan aktivitet.\n\nNyhetsbrevsprenumeration: Tills du avregistrerar dig.\n\nHälsodata (coaching): Raderas 12 månader efter att coachingengagemanget avslutats.\n\nBokföringsdata: 5 år (lagkrav).\n\nTekniska loggfiler: Maximalt 90 dagar.\n\nSamtyckeregister: 5 år efter att samtycke givits/återkallats (dokumentation).\n\nNär du raderar ditt konto anonymiserar vi dina data i enlighet med GDPR art. 17 (rätten till radering)."
  }
}'::jsonb);

-- 5. Your Rights
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 5, true, '{
  "title": {
    "da": "5. Dine rettigheder",
    "en": "5. Your Rights",
    "se": "5. Dina rättigheter"
  },
  "text": {
    "da": "I henhold til GDPR har du følgende rettigheder:\n\nRet til indsigt (art. 15): Du kan anmode om en kopi af de personoplysninger, vi behandler om dig.\n\nRet til berigtigelse (art. 16): Du kan bede os rette forkerte eller ufuldstændige oplysninger.\n\nRet til sletning (art. 17): Du kan bede os slette dine personoplysninger. Du kan gøre dette direkte fra din profilside.\n\nRet til begrænsning (art. 18): Du kan bede os begrænse behandlingen af dine oplysninger.\n\nRet til dataportabilitet (art. 20): Du kan modtage dine data i et struktureret, maskinlæsbart format. Eksportfunktion er tilgængelig på din profilside.\n\nRet til indsigelse (art. 21): Du kan gøre indsigelse mod behandling baseret på berettiget interesse.\n\nRettigheder vedr. automatiserede afgørelser (art. 22): Vi træffer ikke automatiserede afgørelser, der har retsvirkninger for dig.\n\nHenvendelse: privacy@shiftingsource.com\nSvar inden: 30 dage\n\nDu har ret til at klage til Datatilsynet (datatilsynet.dk).",
    "en": "Under GDPR, you have the following rights:\n\nRight of access (Art. 15): You may request a copy of the personal data we process about you.\n\nRight to rectification (Art. 16): You may ask us to correct inaccurate or incomplete data.\n\nRight to erasure (Art. 17): You may ask us to delete your personal data. You can do this directly from your profile page.\n\nRight to restriction (Art. 18): You may ask us to restrict the processing of your data.\n\nRight to data portability (Art. 20): You may receive your data in a structured, machine-readable format. Export functionality is available on your profile page.\n\nRight to object (Art. 21): You may object to processing based on legitimate interest.\n\nRights regarding automated decisions (Art. 22): We do not make automated decisions that have legal effects on you.\n\nContact: privacy@shiftingsource.com\nResponse within: 30 days\n\nYou have the right to lodge a complaint with the Danish Data Protection Agency (datatilsynet.dk) or your local supervisory authority.",
    "se": "Enligt GDPR har du följande rättigheter:\n\nRätt till tillgång (art. 15): Du kan begära en kopia av de personuppgifter vi behandlar om dig.\n\nRätt till rättelse (art. 16): Du kan be oss korrigera felaktiga eller ofullständiga uppgifter.\n\nRätt till radering (art. 17): Du kan be oss radera dina personuppgifter. Du kan göra detta direkt från din profilsida.\n\nRätt till begränsning (art. 18): Du kan be oss begränsa behandlingen av dina uppgifter.\n\nRätt till dataportabilitet (art. 20): Du kan ta emot dina data i ett strukturerat, maskinläsbart format. Exportfunktion finns tillgänglig på din profilsida.\n\nRätt att göra invändningar (art. 21): Du kan invända mot behandling baserad på berättigat intresse.\n\nRättigheter gällande automatiserade beslut (art. 22): Vi fattar inga automatiserade beslut som har rättsliga effekter för dig.\n\nKontakt: privacy@shiftingsource.com\nSvar inom: 30 dagar\n\nDu har rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (imy.se) eller din lokala tillsynsmyndighet."
  }
}'::jsonb);

-- 6. Data Security (NIS2)
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 6, true, '{
  "title": {
    "da": "6. Datasikkerhed og NIS2",
    "en": "6. Data Security and NIS2",
    "se": "6. Datasäkerhet och NIS2"
  },
  "text": {
    "da": "Vi implementerer passende tekniske og organisatoriske sikkerhedsforanstaltninger i overensstemmelse med GDPR art. 32 og NIS2-direktivet:\n\nKryptering: Alle data overføres via TLS 1.2+. Følsomme data krypteres i hvile.\n\nAdgangskontrol: Rollebaseret adgangsstyring (RLS) på databaseniveau. Multifaktor-autentificering for administratorer.\n\nOvervågning: Automatiserede daglige sundhedstjek af alle systemer. Logning af sikkerhedshændelser.\n\nHændelseshåndtering: Procedure for håndtering af databrud i overensstemmelse med GDPR art. 33-34 (notifikation inden 72 timer).\n\nTredjepartssikkerhed: Alle databehandlere er vurderet og har underskrevet databehandleraftaler.\n\nRegelmæssig revision: Sikkerhedsaudit gennemføres minimum årligt.",
    "en": "We implement appropriate technical and organizational security measures in accordance with GDPR Art. 32 and the NIS2 Directive:\n\nEncryption: All data is transmitted via TLS 1.2+. Sensitive data is encrypted at rest.\n\nAccess control: Role-based access control (RLS) at database level. Multi-factor authentication for administrators.\n\nMonitoring: Automated daily health checks of all systems. Security event logging.\n\nIncident response: Procedure for handling data breaches in accordance with GDPR Art. 33-34 (notification within 72 hours).\n\nThird-party security: All data processors are assessed and have signed data processing agreements.\n\nRegular audits: Security audits are conducted at minimum annually.",
    "se": "Vi implementerar lämpliga tekniska och organisatoriska säkerhetsåtgärder i enlighet med GDPR art. 32 och NIS2-direktivet:\n\nKryptering: All data överförs via TLS 1.2+. Känsliga data krypteras i vila.\n\nÅtkomstkontroll: Rollbaserad åtkomstkontroll (RLS) på databasnivå. Multifaktorautentisering för administratörer.\n\nÖvervakning: Automatiserade dagliga hälsokontroller av alla system. Loggning av säkerhetshändelser.\n\nIncidenthantering: Procedur för hantering av dataintrång i enlighet med GDPR art. 33-34 (anmälan inom 72 timmar).\n\nTredjepartssäkerhet: Alla personuppgiftsbiträden är bedömda och har undertecknat personuppgiftsbiträdesavtal.\n\nRegelbunden revision: Säkerhetsrevisioner genomförs minst årligen."
  }
}'::jsonb);

-- 7. Third-Party Services
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 7, true, '{
  "title": {
    "da": "7. Tredjepartstjenester og databehandlere",
    "en": "7. Third-Party Services and Data Processors",
    "se": "7. Tredjepartstjänster och personuppgiftsbiträden"
  },
  "text": {
    "da": "Vi bruger følgende tredjepartstjenester (alle med databehandleraftale):\n\nSupabase (EU-hosting): Database, autentificering, serverløse funktioner.\n\nOpenAI: AI-assisteret chat og indholdsgenerering. Data sendes ikke til træning.\n\nGoogle Analytics 4: Anonym webanalyse (kun med dit samtykke).\n\none.com (Danmark): Webhosting og e-mail.\n\nIngen data overføres til lande uden for EU/EØS uden passende garantier (GDPR art. 44-49).",
    "en": "We use the following third-party services (all with data processing agreements):\n\nSupabase (EU-hosted): Database, authentication, serverless functions.\n\nOpenAI: AI-assisted chat and content generation. Data is not sent for training.\n\nGoogle Analytics 4: Anonymous web analytics (only with your consent).\n\none.com (Denmark): Web hosting and email.\n\nNo data is transferred to countries outside the EU/EEA without appropriate safeguards (GDPR Art. 44-49).",
    "se": "Vi använder följande tredjepartstjänster (alla med personuppgiftsbiträdesavtal):\n\nSupabase (EU-hosting): Databas, autentisering, serverlösa funktioner.\n\nOpenAI: AI-assisterad chatt och innehållsgenerering. Data skickas inte för träning.\n\nGoogle Analytics 4: Anonym webbanalys (endast med ditt samtycke).\n\none.com (Danmark): Webbhosting och e-post.\n\nInga data överförs till länder utanför EU/EES utan lämpliga skyddsåtgärder (GDPR art. 44-49)."
  }
}'::jsonb);

-- 8. Cookies
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 8, true, '{
  "title": {
    "da": "8. Cookies og sporingsteknologi",
    "en": "8. Cookies and Tracking Technology",
    "se": "8. Kakor och spårningsteknik"
  },
  "text": {
    "da": "Vi bruger cookies i overensstemmelse med ePrivacy-direktivet:\n\nNødvendige cookies: Session-håndtering, autentificering, sprogvalg. Kræver ikke samtykke.\n\nAnalyse-cookies: Google Analytics 4 (anonymiseret). Kræver dit samtykke.\n\nMarkedsføringscookies: Bruges ikke.\n\nDu kan til enhver tid ændre dine cookie-præferencer via cookie-banneret eller din browser.",
    "en": "We use cookies in accordance with the ePrivacy Directive:\n\nNecessary cookies: Session management, authentication, language selection. Do not require consent.\n\nAnalytics cookies: Google Analytics 4 (anonymized). Require your consent.\n\nMarketing cookies: Not used.\n\nYou can change your cookie preferences at any time via the cookie banner or your browser.",
    "se": "Vi använder kakor i enlighet med ePrivacy-direktivet:\n\nNödvändiga kakor: Sessionshantering, autentisering, språkval. Kräver inte samtycke.\n\nAnalyskakor: Google Analytics 4 (anonymiserad). Kräver ditt samtycke.\n\nMarknadsföringskakor: Används inte.\n\nDu kan när som helst ändra dina kakinställningar via kakbannern eller din webbläsare."
  }
}'::jsonb);

-- 9. Updates
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('privacy', 'content_block', 9, true, '{
  "title": {
    "da": "9. Ændringer til denne politik",
    "en": "9. Changes to This Policy",
    "se": "9. Ändringar av denna policy"
  },
  "text": {
    "da": "Vi opdaterer denne privatlivspolitik ved behov og offentliggør ændringer her. Ved væsentlige ændringer giver vi besked via e-mail eller en meddelelse på hjemmesiden.\n\nSenest opdateret: Marts 2026",
    "en": "We update this privacy policy as needed and publish changes here. For significant changes, we will notify you via email or a notice on the website.\n\nLast updated: March 2026",
    "se": "Vi uppdaterar denna integritetspolicy vid behov och publicerar ändringar här. Vid väsentliga ändringar meddelar vi dig via e-post eller ett meddelande på webbplatsen.\n\nSenast uppdaterad: Mars 2026"
  }
}'::jsonb);


-- ═══════════════════════════════════════════════════════════════
-- TERMS OF SERVICE
-- ═══════════════════════════════════════════════════════════════

-- 1. Acceptance
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 1, true, '{
  "title": {
    "da": "1. Accept af vilkår",
    "en": "1. Acceptance of Terms",
    "se": "1. Godkännande av villkor"
  },
  "text": {
    "da": "Ved at bruge Shifting Source'' hjemmeside og tjenester (\"Tjenesten\") accepterer du disse vilkår og betingelser. Hvis du ikke er enig i disse vilkår, bedes du ikke bruge Tjenesten.\n\nTjenesten drives af Shifting Source med hjemsted i Danmark og er underlagt dansk og europæisk lovgivning, herunder GDPR (EU) 2016/679 og NIS2-direktivet (EU) 2022/2555.\n\nDu skal være mindst 16 år gammel for at bruge Tjenesten. Hvis du er under 18, skal du have forældres eller værges samtykke.",
    "en": "By using Shifting Source''s website and services (\"the Service\"), you accept these terms and conditions. If you do not agree to these terms, please do not use the Service.\n\nThe Service is operated by Shifting Source, domiciled in Denmark, and is subject to Danish and European law, including GDPR (EU) 2016/679 and the NIS2 Directive (EU) 2022/2555.\n\nYou must be at least 16 years old to use the Service. If you are under 18, you must have parental or guardian consent.",
    "se": "Genom att använda Shifting Sources webbplats och tjänster (\"Tjänsten\") godkänner du dessa villkor. Om du inte godkänner dessa villkor, vänligen använd inte Tjänsten.\n\nTjänsten drivs av Shifting Source med säte i Danmark och lyder under dansk och europeisk lagstiftning, inklusive GDPR (EU) 2016/679 och NIS2-direktivet (EU) 2022/2555.\n\nDu måste vara minst 16 år gammal för att använda Tjänsten. Om du är under 18 måste du ha förälders eller vårdnadshavares samtycke."
  }
}'::jsonb);

-- 2. Description of Service
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 2, true, '{
  "title": {
    "da": "2. Beskrivelse af Tjenesten",
    "en": "2. Description of the Service",
    "se": "2. Beskrivning av Tjänsten"
  },
  "text": {
    "da": "Shifting Source tilbyder en platform med fokus på sundhed og livsstil, herunder:\n\nInformationsindhold: Artikler, guider og opskrifter om keto, faste og sundhed.\n\nBeregningsværktøjer: TDEE/BMR-beregner, makronæringsberegner.\n\nKostplangenerator: AI-baseret generering af personlige kostplaner.\n\nAI-chatassistent: Vejledning og information om sundhedsemner.\n\nCoaching-tjenester: Personlig coaching med check-ins og opfølgning (betalt tjeneste).\n\nNyhedsbrev: Regelmæssige opdateringer om sundhed og livsstil.",
    "en": "Shifting Source offers a platform focused on health and lifestyle, including:\n\nInformational content: Articles, guides, and recipes about keto, fasting, and health.\n\nCalculation tools: TDEE/BMR calculator, macronutrient calculator.\n\nMeal plan generator: AI-based generation of personalized meal plans.\n\nAI chat assistant: Guidance and information on health topics.\n\nCoaching services: Personal coaching with check-ins and follow-up (paid service).\n\nNewsletter: Regular updates on health and lifestyle.",
    "se": "Shifting Source erbjuder en plattform med fokus på hälsa och livsstil, inklusive:\n\nInformationsinnehåll: Artiklar, guider och recept om keto, fasta och hälsa.\n\nBeräkningsverktyg: TDEE/BMR-kalkylator, makronäringskalkylator.\n\nKostplansgenerator: AI-baserad generering av personliga kostplaner.\n\nAI-chattassistent: Vägledning och information om hälsoämnen.\n\nCoachingtjänster: Personlig coaching med check-ins och uppföljning (betaltjänst).\n\nNyhetsbrev: Regelbundna uppdateringar om hälsa och livsstil."
  }
}'::jsonb);

-- 3. Health Disclaimer
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 3, true, '{
  "title": {
    "da": "3. Sundhedsansvarsfraskrivelse",
    "en": "3. Health Disclaimer",
    "se": "3. Hälsofriskrivning"
  },
  "text": {
    "da": "VIGTIGT: Indholdet på Shifting Source er udelukkende til informationsformål og erstatter IKKE professionel medicinsk rådgivning, diagnose eller behandling.\n\nKonsulter altid din læge før du påbegynder en ny kost, faste-regime eller træningsprogram, særligt hvis du har eksisterende helbredsproblemer, er gravid, ammer eller tager medicin.\n\nVores AI-chatassistent og kostplangenerator giver generel information og er ikke en erstatning for en autoriseret sundhedsfaglig.\n\nVi påtager os intet ansvar for sundhedsmæssige konsekvenser af at følge information eller råd fra platformen.",
    "en": "IMPORTANT: The content on Shifting Source is for informational purposes only and does NOT replace professional medical advice, diagnosis, or treatment.\n\nAlways consult your doctor before starting a new diet, fasting regimen, or exercise program, especially if you have existing health conditions, are pregnant, breastfeeding, or taking medication.\n\nOur AI chat assistant and meal plan generator provide general information and are not a substitute for a licensed healthcare professional.\n\nWe assume no responsibility for health consequences resulting from following information or advice from the platform.",
    "se": "VIKTIGT: Innehållet på Shifting Source är enbart i informationssyfte och ersätter INTE professionell medicinsk rådgivning, diagnos eller behandling.\n\nRådgör alltid med din läkare innan du påbörjar en ny kost, fasta-regim eller träningsprogram, särskilt om du har befintliga hälsoproblem, är gravid, ammar eller tar medicin.\n\nVår AI-chattassistent och kostplansgenerator ger allmän information och är inte en ersättning för legitimerad sjukvårdspersonal.\n\nVi tar inget ansvar för hälsomässiga konsekvenser av att följa information eller råd från plattformen."
  }
}'::jsonb);

-- 4. User Accounts
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 4, true, '{
  "title": {
    "da": "4. Brugerkonti og ansvar",
    "en": "4. User Accounts and Responsibilities",
    "se": "4. Användarkonton och ansvar"
  },
  "text": {
    "da": "Du er ansvarlig for at holde dine loginoplysninger fortrolige og for al aktivitet under din konto.\n\nDu forpligter dig til at give korrekte og opdaterede oplysninger.\n\nDu må ikke dele din konto med andre eller bruge andres konti.\n\nDu må ikke bruge Tjenesten til ulovlige formål, spam, chikane eller distribution af skadeligt indhold.\n\nVi forbeholder os retten til at suspendere eller slette konti, der overtræder disse vilkår.\n\nDu kan til enhver tid slette din konto via din profilside. Ved sletning anonymiseres dine data i henhold til vores privatlivspolitik.",
    "en": "You are responsible for keeping your login credentials confidential and for all activity under your account.\n\nYou agree to provide accurate and up-to-date information.\n\nYou may not share your account with others or use others'' accounts.\n\nYou may not use the Service for illegal purposes, spam, harassment, or distribution of harmful content.\n\nWe reserve the right to suspend or delete accounts that violate these terms.\n\nYou can delete your account at any time via your profile page. Upon deletion, your data will be anonymized in accordance with our privacy policy.",
    "se": "Du ansvarar för att hålla dina inloggningsuppgifter konfidentiella och för all aktivitet under ditt konto.\n\nDu förbinder dig att lämna korrekta och uppdaterade uppgifter.\n\nDu får inte dela ditt konto med andra eller använda andras konton.\n\nDu får inte använda Tjänsten för olagliga ändamål, spam, trakasserier eller distribution av skadligt innehåll.\n\nVi förbehåller oss rätten att stänga av eller radera konton som bryter mot dessa villkor.\n\nDu kan när som helst radera ditt konto via din profilsida. Vid radering anonymiseras dina data i enlighet med vår integritetspolicy."
  }
}'::jsonb);

-- 5. Intellectual Property
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 5, true, '{
  "title": {
    "da": "5. Immaterielle rettigheder",
    "en": "5. Intellectual Property",
    "se": "5. Immateriella rättigheter"
  },
  "text": {
    "da": "Alt indhold på Shifting Source — herunder tekst, billeder, design, logoer, kode og AI-genereret indhold — tilhører Shifting Source eller dets licensgivere og er beskyttet af ophavsretsloven.\n\nDu må bruge indholdet til personlig, ikke-kommerciel brug.\n\nDu må ikke kopiere, distribuere, sælge eller skabe afledte værker uden vores skriftlige samtykke.\n\nKostplaner genereret til dig er til din personlige brug og må ikke videresælges.",
    "en": "All content on Shifting Source — including text, images, design, logos, code, and AI-generated content — belongs to Shifting Source or its licensors and is protected by copyright law.\n\nYou may use the content for personal, non-commercial use.\n\nYou may not copy, distribute, sell, or create derivative works without our written consent.\n\nMeal plans generated for you are for your personal use and may not be resold.",
    "se": "Allt innehåll på Shifting Source — inklusive text, bilder, design, logotyper, kod och AI-genererat innehåll — tillhör Shifting Source eller dess licensgivare och skyddas av upphovsrättslagen.\n\nDu får använda innehållet för personligt, icke-kommersiellt bruk.\n\nDu får inte kopiera, distribuera, sälja eller skapa härledda verk utan vårt skriftliga samtycke.\n\nKostplaner genererade för dig är för ditt personliga bruk och får inte säljas vidare."
  }
}'::jsonb);

-- 6. AI Content Disclaimer
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 6, true, '{
  "title": {
    "da": "6. AI-genereret indhold",
    "en": "6. AI-Generated Content",
    "se": "6. AI-genererat innehåll"
  },
  "text": {
    "da": "Dele af vores indhold genereres ved hjælp af kunstig intelligens (AI), herunder chatbeskeder, kostplaner og visse artikler.\n\nAI-genereret indhold kan indeholde unøjagtigheder og bør ikke betragtes som faktuelt uden verifikation.\n\nAI-chatten gemmer ikke samtalehistorik mellem sessioner.\n\nVi bestræber os på at mærke AI-genereret indhold tydeligt.\n\nAnvendelse af AI-tjenester er underlagt OpenAI''s brugsbetingelser i tillæg til disse vilkår.",
    "en": "Parts of our content are generated using artificial intelligence (AI), including chat messages, meal plans, and certain articles.\n\nAI-generated content may contain inaccuracies and should not be considered factual without verification.\n\nThe AI chat does not retain conversation history between sessions.\n\nWe strive to clearly label AI-generated content.\n\nUse of AI services is subject to OpenAI''s terms of use in addition to these terms.",
    "se": "Delar av vårt innehåll genereras med hjälp av artificiell intelligens (AI), inklusive chattmeddelanden, kostplaner och vissa artiklar.\n\nAI-genererat innehåll kan innehålla felaktigheter och bör inte betraktas som faktabaserat utan verifiering.\n\nAI-chatten sparar inte konversationshistorik mellan sessioner.\n\nVi strävar efter att tydligt märka AI-genererat innehåll.\n\nAnvändning av AI-tjänster lyder under OpenAI:s användarvillkor utöver dessa villkor."
  }
}'::jsonb);

-- 7. Limitation of Liability
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 7, true, '{
  "title": {
    "da": "7. Ansvarsbegrænsning",
    "en": "7. Limitation of Liability",
    "se": "7. Ansvarsbegränsning"
  },
  "text": {
    "da": "Tjenesten leveres \"som den er\" uden garanti for fuldstændighed, nøjagtighed eller tilgængelighed.\n\nShifting Source er ikke ansvarlig for indirekte tab, tabt fortjeneste, datatab eller skader, der opstår som følge af brug af Tjenesten, i det omfang gældende lovgivning tillader.\n\nVores samlede erstatningsansvar er begrænset til det beløb, du har betalt for Tjenesten i de seneste 12 måneder.\n\nIntet i disse vilkår begrænser rettigheder, der ikke kan fraviges efter EU- eller national lovgivning, herunder forbrugerrettigheder.",
    "en": "The Service is provided \"as is\" without warranty of completeness, accuracy, or availability.\n\nShifting Source is not liable for indirect losses, lost profits, data loss, or damages arising from use of the Service, to the extent permitted by applicable law.\n\nOur total liability is limited to the amount you have paid for the Service in the past 12 months.\n\nNothing in these terms limits rights that cannot be waived under EU or national law, including consumer rights.",
    "se": "Tjänsten tillhandahålls \"i befintligt skick\" utan garanti för fullständighet, noggrannhet eller tillgänglighet.\n\nShifting Source ansvarar inte för indirekta förluster, utebliven vinst, dataförlust eller skador som uppstår till följd av användning av Tjänsten, i den utsträckning tillämplig lag tillåter.\n\nVårt totala skadeståndsansvar är begränsat till det belopp du har betalat för Tjänsten under de senaste 12 månaderna.\n\nInget i dessa villkor begränsar rättigheter som inte kan frånses enligt EU- eller nationell lagstiftning, inklusive konsumenträttigheter."
  }
}'::jsonb);

-- 8. Governing Law
INSERT INTO page_sections (page, section_type, sort_order, enabled, content) VALUES
('terms', 'content_block', 8, true, '{
  "title": {
    "da": "8. Lovvalg og tvistløsning",
    "en": "8. Governing Law and Dispute Resolution",
    "se": "8. Tillämplig lag och tvistlösning"
  },
  "text": {
    "da": "Disse vilkår er underlagt dansk ret.\n\nTvister søges først løst i mindelighed. Hvis det ikke er muligt, afgøres tvister ved de danske domstole.\n\nForbrugere i EU kan desuden benytte EU-Kommissionens online klageplatform: ec.europa.eu/consumers/odr\n\nSenest opdateret: Marts 2026",
    "en": "These terms are governed by Danish law.\n\nDisputes shall first be resolved amicably. If this is not possible, disputes shall be settled by the Danish courts.\n\nConsumers in the EU may also use the European Commission''s online dispute resolution platform: ec.europa.eu/consumers/odr\n\nLast updated: March 2026",
    "se": "Dessa villkor lyder under dansk lag.\n\nTvister ska först lösas i godo. Om det inte är möjligt ska tvister avgöras av danska domstolar.\n\nKonsumenter i EU kan även använda EU-kommissionens plattform för tvistlösning online: ec.europa.eu/consumers/odr\n\nSenast uppdaterad: Mars 2026"
  }
}'::jsonb);
