const XLSX = require('xlsx');

// Define all fields that the application accepts
const headers = [
    // Required fields
    'department',
    'companyName',
    'fromDate',
    'toDate',
    'status',
    'description',
    'documentAvailability',
    'goingForRenewal',

    // Optional fields
    'scannedCopy',
    'companyWebsite',
    'aboutCompany',
    'companyAddress',
    'industryContactName',
    'industryContactMobile',
    'industryContactEmail',
    'institutionContactName',
    'institutionContactMobile',
    'institutionContactEmail',
    'clubsAligned',
    'sdgGoals',
    'skillsTechnologies',
    'perStudentCost',
    'placementOpportunity',
    'internshipOpportunity',
    'benefitsAchieved',
    'companyRelationship'
];

// Sample data row with examples
const sampleData = [
    {
        department: 'CSE',
        companyName: 'Tech Corporation Pvt Ltd',
        fromDate: '01.01.2024',
        toDate: '31.12.2024',
        status: 'Active',
        description: 'Training and placement collaboration',
        documentAvailability: 'Available',
        goingForRenewal: 'Yes',
        scannedCopy: 'https://drive.google.com/file/d/example',
        companyWebsite: 'https://www.techcorp.com',
        aboutCompany: 'Leading technology solutions provider',
        companyAddress: '123 Tech Park, Bangalore, Karnataka - 560001',
        industryContactName: 'John Doe',
        industryContactMobile: '9876543210',
        industryContactEmail: 'john.doe@techcorp.com',
        institutionContactName: 'Dr. Jane Smith',
        institutionContactMobile: '9876543211',
        institutionContactEmail: 'jane.smith@sairam.edu.in',
        clubsAligned: 'Coding Club, Innovation Club',
        sdgGoals: 'Quality Education, Industry Innovation',
        skillsTechnologies: 'Python, AI/ML, Data Science, Cloud Computing',
        perStudentCost: 5000,
        placementOpportunity: 10,
        internshipOpportunity: 25,
        benefitsAchieved: 'Trained 50 students, 5 placements completed',
        companyRelationship: 4
    },
    {
        department: 'AIDS',
        companyName: 'AI Labs India',
        fromDate: '15.02.2024',
        toDate: '15.02.2025',
        status: 'Draft',
        description: 'Research collaboration in AI',
        documentAvailability: 'Not Available',
        goingForRenewal: 'No',
        scannedCopy: '',
        companyWebsite: 'https://www.ailabs.in',
        aboutCompany: 'AI research and development company',
        companyAddress: '45 Innovation Center, Chennai, Tamil Nadu - 600001',
        industryContactName: 'Raj Kumar',
        industryContactMobile: '9876543212',
        industryContactEmail: 'raj@ailabs.in',
        institutionContactName: 'Prof. Anita Patel',
        institutionContactMobile: '9876543213',
        institutionContactEmail: 'anita.patel@sairam.edu.in',
        clubsAligned: 'AI Club, Data Science Club',
        sdgGoals: 'Quality Education, Innovation',
        skillsTechnologies: 'Machine Learning, Deep Learning, NLP',
        perStudentCost: 0,
        placementOpportunity: 5,
        internshipOpportunity: 15,
        benefitsAchieved: '',
        companyRelationship: 3
    }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sampleData);

// Set column widths for better readability
const wscols = headers.map(() => ({ wch: 20 }));
ws['!cols'] = wscols;

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'eMoU Records');

// Add instructions sheet
const instructions = [
    { Field: 'REQUIRED FIELDS', Description: '(Must be filled for each record)', Example: '' },
    { Field: 'department', Description: 'Department code', Example: 'CSE, ECE, MECH, CIVIL, EEE, IT, AIDS, CSBS' },
    { Field: 'companyName', Description: 'Full name of the company', Example: 'Tech Corporation Pvt Ltd' },
    { Field: 'fromDate', Description: 'Start date in DD.MM.YYYY format', Example: '01.01.2024' },
    { Field: 'toDate', Description: 'End date in DD.MM.YYYY format', Example: '31.12.2024' },
    { Field: 'status', Description: 'Current status of eMoU', Example: 'Active, Expired, Renewal Pending, Draft' },
    { Field: 'description', Description: 'Purpose or description', Example: 'Training and placement collaboration' },
    { Field: 'documentAvailability', Description: 'Document availability status', Example: 'Available, Not Available' },
    { Field: 'goingForRenewal', Description: 'Renewal status', Example: 'Yes, No' },
    { Field: '', Description: '', Example: '' },
    { Field: 'OPTIONAL FIELDS', Description: '(Can be left empty)', Example: '' },
    { Field: 'scannedCopy', Description: 'Google Drive link to scanned copy', Example: 'https://drive.google.com/file/d/...' },
    { Field: 'companyWebsite', Description: 'Company website URL', Example: 'https://www.company.com' },
    { Field: 'aboutCompany', Description: 'Brief about the company', Example: 'Leading technology solutions provider' },
    { Field: 'companyAddress', Description: 'Full company address', Example: '123 Tech Park, City, State - 560001' },
    { Field: 'industryContactName', Description: 'Industry contact person name', Example: 'John Doe' },
    { Field: 'industryContactMobile', Description: 'Industry contact mobile', Example: '9876543210' },
    { Field: 'industryContactEmail', Description: 'Industry contact email', Example: 'john@company.com' },
    { Field: 'institutionContactName', Description: 'Institution contact person name', Example: 'Dr. Jane Smith' },
    { Field: 'institutionContactMobile', Description: 'Institution contact mobile', Example: '9876543211' },
    { Field: 'institutionContactEmail', Description: 'Institution contact email', Example: 'jane@sairam.edu.in' },
    { Field: 'clubsAligned', Description: 'Clubs aligned with this eMoU', Example: 'Coding Club, Innovation Club' },
    { Field: 'sdgGoals', Description: 'Sairam SDG Goals aligned', Example: 'Quality Education, Industry Innovation' },
    { Field: 'skillsTechnologies', Description: 'Skills/Technologies to be learned', Example: 'Python, AI/ML, Data Science' },
    { Field: 'perStudentCost', Description: 'Cost per student (number)', Example: '5000' },
    { Field: 'placementOpportunity', Description: 'Number of placement opportunities', Example: '10' },
    { Field: 'internshipOpportunity', Description: 'Number of internship opportunities', Example: '25' },
    { Field: 'benefitsAchieved', Description: 'Benefits achieved so far', Example: 'Trained 50 students, 5 placements' },
    { Field: 'companyRelationship', Description: 'Relationship scale (1-5)', Example: '1, 2, 3, 4, or 5' }
];

const wsInstructions = XLSX.utils.json_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Write file
XLSX.writeFile(wb, 'eMoU_Import_Template.xlsx');

console.log('✅ Excel template created: eMoU_Import_Template.xlsx');
console.log('\nThe file includes:');
console.log('- Sheet 1: Sample data with 2 example records');
console.log('- Sheet 2: Instructions with field descriptions');
console.log('\nYou can now use this template to import eMoU records!');
