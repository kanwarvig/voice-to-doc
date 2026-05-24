export type SamplePatient = {
  id: string;
  name: string;
  specialty: string;
  /** Served from public/samples — loaded as a File through the upload pipeline */
  fileName: string;
  fileUrl: string;
};

export const SAMPLE_PATIENTS: SamplePatient[] = [
  {
    id: "john-smith",
    name: "John Smith",
    specialty: "Cardiology / angina",
    fileName: "john_smith_cardiology.txt",
    fileUrl: "/samples/john_smith_cardiology.txt",
  },
  {
    id: "maria-lopez",
    name: "Maria Lopez",
    specialty: "Diabetes / endocrine",
    fileName: "maria_lopez_diabetes.txt",
    fileUrl: "/samples/maria_lopez_diabetes.txt",
  },
  {
    id: "robert-chen",
    name: "Robert Chen",
    specialty: "COPD / respiratory",
    fileName: "robert_chen_copd.txt",
    fileUrl: "/samples/robert_chen_copd.txt",
  },
  {
    id: "sarah-patel",
    name: "Sarah Patel",
    specialty: "Psychiatry / anxiety",
    fileName: "sarah_patel_psychiatry.txt",
    fileUrl: "/samples/sarah_patel_psychiatry.txt",
  },
  {
    id: "james-wilson",
    name: "James Wilson",
    specialty: "Atrial fib / anticoagulation",
    fileName: "james_wilson_atrial_fib.txt",
    fileUrl: "/samples/james_wilson_atrial_fib.txt",
  },
  {
    id: "eleanor-nguyen",
    name: "Eleanor Nguyen",
    specialty: "Geriatric / polypharmacy",
    fileName: "eleanor_nguyen_geriatric.txt",
    fileUrl: "/samples/eleanor_nguyen_geriatric.txt",
  },
];
