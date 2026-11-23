// Deterministic five-minute occupancy cells. Every reservation writes these keys
// atomically for BOTH the assigned clinician and the patient.
const STEP_MS=5*60*1000;
export function slotKeys({staffId,patientId,start,durationMinutes}){
  if(typeof staffId!=='string'||!staffId||typeof patientId!=='string'||!patientId)throw new Error('Missing booking identity');
  if(!(start instanceof Date)||!Number.isFinite(start.getTime())||start.getTime()%STEP_MS!==0)throw new Error('Start must be on a five-minute boundary');
  if(!Number.isInteger(durationMinutes)||durationMinutes<5||durationMinutes>480)throw new Error('Invalid service duration');
  const begin=Math.floor(start.getTime()/STEP_MS);
  const count=Math.ceil(durationMinutes/5);
  const keys=[];
  for(let i=0;i<count;i++){
    keys.push('staff_'+staffId+'_'+(begin+i));
    keys.push('patient_'+patientId+'_'+(begin+i));
  }
  return keys;
}
