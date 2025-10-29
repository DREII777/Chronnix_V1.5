This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Authentication Email Setup

Use [Resend](https://resend.com) to deliver OTP codes generated during login. Configure the following environment variables before running the application in production:

- `RESEND_API_KEY` – API key issued by Resend (a fallback to `AUTH_EMAIL_CLIENT` is kept for backwards compatibility).
- `AUTH_EMAIL_SENDER` – Verified sender address configured in Resend, e.g. `Chronnix <login@chronnix.app>`.

## Timesheet Exports

- Export the payroll, detail or global workbook from the timesheet dashboard via the new “Exporter” modal.
- Choose whether to keep the one-page landscape layout and coloured zebra styles before downloading.
- The backend builds the Excel workbook with the same structure and styling rules as the Chronnix legacy reference (ExcelJS based builder).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
