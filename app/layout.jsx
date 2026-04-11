import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import '../styles/dashboard.css';
import '../styles/auth.css';

import { Inter, Poppins } from 'next/font/google';
import Providers from './providers';
import Footer from '../components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','700'] });

export const metadata = {
  title: 'Smart Student Clearance & Degree Issuance System',
  description: 'University clearance and degree issuance platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${poppins.className}`}>
        <Providers>
          <div className="app-root d-flex flex-column min-vh-100">
            <main className="flex-grow-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}