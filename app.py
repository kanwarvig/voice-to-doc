import streamlit as st
import anthropic
import os
import sys
import whisper
import tempfile
from dotenv import load_dotenv
from audio_recorder_streamlit import audio_recorder

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@st.cache_resource
def load_whisper_model():
    return whisper.load_model("base")

st.set_page_config(page_title="Voice-to-Doc AI", page_icon="🏥", layout="centered")

st.title("🏥 Voice-to-Documentation AI")
st.subheader("Physician Documentation Assistant")
st.markdown("---")

st.markdown("### Step 1 — Upload Patient Record")
patient_file = st.file_uploader("Upload patient record (.txt)", type=["txt"])

patient_data = ""
if patient_file is not None:
    patient_data = patient_file.read().decode("utf-8")
    st.success("Patient record loaded successfully")
    with st.expander("View patient record"):
        st.text(patient_data)

st.markdown("### Step 2 — Record Physician Dictation")
st.markdown("Click the microphone button and speak your 30-second dictation")

audio_bytes = audio_recorder(
    text="Click to record",
    recording_color="#e74c3c",
    neutral_color="#2ecc71",
    icon_size="2x"
)

dictation_text = ""

if audio_bytes:
    st.audio(audio_bytes, format="audio/wav")
    st.info("Transcribing your dictation...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
        tmp_file.write(audio_bytes)
        tmp_file_path = tmp_file.name
    
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))
    from medical_corrections import apply_medical_corrections

    med_hint = ""
    if patient_data:
        for line in patient_data.splitlines():
            if "medication" in line.lower():
                med_hint = line
                break

    initial_prompt = (
        "Physician clinical dictation. Medical terminology including "
        f"atorvastatin, metformin, lisinopril, hypertension, hyperlipidemia, HbA1c. {med_hint}"
    )

    model = load_whisper_model()
    result = model.transcribe(
        tmp_file_path,
        initial_prompt=initial_prompt,
        language="en",
        verbose=False,
        fp16=False,
    )
    dictation_text = apply_medical_corrections(result["text"])
    os.unlink(tmp_file_path)
    
    st.success("Transcription complete")
    st.markdown("**Your dictation:**")
    st.write(dictation_text)

st.markdown("### Step 3 — Generate Clinical Note")
if st.button("Generate Clinical Note", type="primary"):
    if not patient_data:
        st.error("Please upload a patient record first")
    elif not dictation_text:
        st.error("Please record your dictation first")
    else:
        with st.spinner("Generating clinical note..."):
            prompt = f"""You are a medical documentation assistant. Using the physician's dictation and the patient's existing record, generate a complete, structured clinical note in SOAP format.

PATIENT RECORD:
{patient_data}

PHYSICIAN DICTATION:
{dictation_text}

Generate a complete clinical note with the following sections:
- Date of Visit
- Subjective (patient complaints and history)
- Objective (vitals, observations, test results)
- Assessment (diagnosis and clinical impression)
- Plan (treatment, medications, follow-up)
- Physician Sign-off line

Keep it professional, concise, and medically accurate based on the information provided."""

            message = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            clinical_note = message.content[0].text

            st.markdown("---")
            st.markdown("### Generated Clinical Note")
            st.markdown(clinical_note)

            st.download_button(
                label="Download Clinical Note",
                data=clinical_note,
                file_name="clinical_note.txt",
                mime="text/plain"
            )

st.markdown("---")
st.caption("Built by Kanwar Vig — Voice-to-Documentation AI Tool | May 2026")