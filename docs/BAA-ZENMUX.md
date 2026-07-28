# Business Associate Agreement (BAA)
## Between Kynthai US ("Covered Entity") and ZenMux Inc. ("Business Associate")

---

**Effective Date:** [to be signed]
**Parties:**
- **Covered Entity:** Kynthai US ("Kynthai"), a healthcare technology platform operating in the United States
- **Business Associate:** ZenMux Inc. ("ZenMux"), providing AI language model processing services via their API

---

## 1. PURPOSE AND SCOPE

This Business Associate Agreement ("Agreement") is entered into pursuant to the Health Insurance Portability and Accountability Act of 1996, as amended by the Health Information Technology for Economic and Clinical Health Act ("HIPAA"), and the regulations promulgated thereunder (45 C.F.R. Parts 160 and 164).

This Agreement governs the disclosure of Protected Health Information ("PHI") by Kynthai to ZenMux for the purpose of providing AI-powered health information services through the Kynthai application.

## 2. DEFINITIONS

**Protected Health Information (PHI):** Individually identifiable health information transmitted or maintained by ZenMux on behalf of Kynthai, including but not limited to medication information, health conditions, symptoms, allergies, and limited demographic data used for personalization.

**De-identified Information:** Information from which all individually identifiable elements have been removed or replaced, such that the information cannot be used to identify an individual.

**Subprocessor:** A third party to whom ZenMux delegates performance of its obligations under this Agreement.

## 3. PERMITTED USES AND DISCLOSURES OF PHI

### 3.1 Permitted Uses
ZenMux shall only use or disclose PHI:
(a) For the performance of AI processing services described in Exhibit A (AI Processing Services);
(b) As required by law; or
(c) As authorized in writing by Kynthai.

### 3.2 Prohibited Uses
ZenMux shall NOT:
(a) Use or disclose PHI for any purpose other than as provided in this Agreement;
(b) Use or disclose PHI for marketing purposes without written authorization;
(c) Use or disclose PHI to its affiliates, agents, or subprocessors unless they comply with HIPAA;
(d) Sell PHI under any circumstances;
(e) Use de-identified information to re-identify any individual.

## 4. OBLIGATIONS OF ZENMUX

### 4.1 Safeguards
ZenMux shall implement and maintain administrative, physical, and technical safeguards to protect the confidentiality, integrity, and availability of all PHI received from Kynthai. These safeguards shall include:
- Encryption of PHI in transit (TLS 1.3 minimum)
- Encryption of PHI at rest where ZenMux stores data
- Access controls limiting PHI access to authorized personnel only
- Regular security assessments and vulnerability scanning
- Incident response plan for security events
- Employee HIPAA training

### 4.2 No Retention
ZenMux shall NOT retain PHI beyond the duration of a single API request/response cycle. PHI shall not be stored, logged, cached, or used for model training after the processing is complete.

### 4.3 Subprocessors
ZenMux shall:
(a) Obtain written assurances from any subprocessor that will receive PHI that the subprocessor will use and disclose PHI only for the purposes permitted by this Agreement;
(b) Remain responsible for compliance with this Agreement by any subprocessor.
(c) Notify Kynthai at least 30 days before adding or removing any subprocessor.

### 4.4 Compliance with Law
ZenMux shall comply with all applicable federal and state laws, rules, and regulations, including but not limited to HIPAA, the HITECH Act, and state health information privacy laws.

## 5. OBLIGATIONS OF KYNTHA

### 5.1 De-identification Before Transmission
Kynthai shall apply de-identification procedures to all PHI transmitted to ZenMux. Specifically, Kynthai shall:
(a) Strip all direct identifiers (name, email, phone, address, SSN, MRN, etc.)
(b) Replace exact dates with relative time ranges
(c) Exclude free-text notes, journal entries, and chat history content
(d) Retain only medically-relevant categories (medication names/dosages, condition names, allergy substances, symptom names, mood labels, alert types)

### 5.2 Consent and Audit
(a) Kynthai shall obtain patient consent before transmitting de-identified health context to ZenMux.
(b) Kynthai shall maintain an audit log of all transmissions to ZenMux, including timestamp, data categories transmitted, and patient reference (no raw PHI values).
(c) Kynthai shall provide ZenMux with evidence of patient consent upon reasonable request.

## 6. BREACH NOTIFICATION

### 6.1 ZenMux Breach Response
In the event of a breach of unsecured PHI, ZenMux shall:
(a) Notify Kynthai within 72 hours of discovery
(b) Provide Kynthai with the identity of each affected individual (if known)
(c) Provide Kynthai with a description of the breach and the PHI involved
(d) Take steps to mitigate the breach
(e) Cooperate fully with Kynthai's breach investigation

### 6.2 Kynthai Breach Notification to Individuals
Kynthai shall notify affected individuals of any breach of PHI that occurs in connection with ZenMux's services in accordance with 45 C.F.R. §164.404.

## 7. TERM AND TERMINATION

### 7.1 Term
This Agreement shall remain in effect for the duration of the business relationship between the parties.

### 7.2 Termination for Cause
Either party may terminate this Agreement immediately upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within 30 days of receiving written notice specifying the breach.

### 7.3 Effect of Termination
Upon termination:
(a) ZenMux shall return or destroy all PHI in its possession
(b) ZenMux shall certify in writing that all PHI has been returned or destroyed
(c) ZenMux shall cease all use and disclosure of PHI

## 8. INSPECTION AND AUDIT

ZenMux shall make available to Kynthai, upon 48 hours' written notice, all internal practices, books, agreements, policies, and procedures relating to the use and disclosure of PHI for audit and inspection purposes, during normal business hours.

## 9. ASSOCIATE AGREEMENT COMPLIANCE

ZenMux acknowledges that:
(a) ZenMux is a "Business Associate" as defined at 45 C.F.R. §160.103;
(b) This Agreement satisfies the requirements of 45 C.F.R. §164.314(a) and §164.502(e);
(c) De-identified information transmitted to ZenMux does not constitute PHI under HIPAA (45 C.F.R. §164.514).

## 10. MISCELLANEOUS

### 10.1 Governing Law
This Agreement shall be governed by the laws of the State of [to be determined], without regard to conflict of law principles.

### 10.2 Severability
If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.

### 10.3 Entire Agreement
This Agreement constitutes the entire agreement between the parties regarding PHI and supersedes all prior agreements, proposals, or representations.

### 10.4 Amendment
This Agreement may only be amended in writing signed by both parties.

---

## SIGNATURES

**FOR KYNTHA US:**
__________________________
Name: [Authorized Signatory]
Title: [CEO / CTO / Authorized Officer]
Date: _______________

**FOR ZENMUX INC.:**
__________________________
Name: [Authorized Signatory]
Title: [CEO / Legal Officer]
Date: _______________
