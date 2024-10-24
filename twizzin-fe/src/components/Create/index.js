'use client';
import AddUpdateGame from './AddUpdateGame';
import { Header } from '../Header';
export const CreateComponent = () => (
  <>
    <Header />
    <main className='flex min-h-screen flex-col items-center p-8 pt-0'>
      <AddUpdateGame />
    </main>
  </>
);
