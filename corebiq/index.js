const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenAI } = require("@google/genai");
const admin = require("firebase-admin");
admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

exports.askCorbiqAI = onRequest(
  { cors: true, secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: "256MiB" },
  async (req,res)=>{
    if(req.method !== "POST") return res.status(405).json({error:"POST only"});
    try{
      const body=req.body||{};
      const prompt=String(body.prompt||"").trim();
      if(!prompt) return res.status(400).json({error:"Prompt required"});
      if(prompt.length>6000) return res.status(400).json({error:"Prompt too long"});
      const ai=new GoogleGenAI({apiKey:GEMINI_API_KEY.value()});
      const system = `You are CorBIQ AI Assistant for an Indian ERP, CRM and compliance application.
Answer business, accounting, GST, income-tax, TDS/TCS, payroll, registration and compliance questions carefully.
Do not claim that a filing, registration or government status has been completed unless the user provides authoritative evidence.
For legal/tax deadlines or rates that may change, clearly say the user should verify current official sources.
Do not request or expose passwords, API keys, OTPs, bank PINs or other secrets.
Keep answers practical and structured.`;
      const response=await ai.models.generateContent({
        model:"gemini-3.8-flash",
        contents: prompt,
        config:{systemInstruction:system, temperature:0.2}
      });
      res.json({text:response.text||"No response generated."});
    }catch(err){
      console.error(err);
      res.status(500).json({error:"AI service unavailable"});
    }
  }
);
