# CV Tailoring

An AI-powered web application that helps tailor your CV/resume to match specific job descriptions, increasing your chances of getting past ATS systems and landing interviews.

## Features

- Upload your CV/resume in DOCX or TXT format
- Upload a job description file or paste text directly
- AI analysis of your CV against the job description
- Tailored suggestions for improvements
- Dynamic processing with real-time status updates

## Tech Stack

- Next.js (React framework)
- TypeScript
- Tailwind CSS for styling
- OpenAI API for text analysis
- File processing for DOCX and TXT formats

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AverageFrost/CV-Tailoring.git
   cd CV-Tailoring
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload your CV/resume using the file uploader
2. Upload a job description file or paste the text directly
3. Click "Tailor CV" to start the process
4. Review the tailored suggestions and updated CV

## License

[MIT](LICENSE)

## Contact

GitHub: [@AverageFrost](https://github.com/AverageFrost) 