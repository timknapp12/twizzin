'use client';
import { useState, useEffect } from 'react';
import { Column, Row } from '../containers';
import { Input } from '../inputs';
import { Button } from '../Button';
import { supabase } from '../../utils/supabaseClient';
import CreateGame from './createGame';
import { useAppContext } from '@/contexts/AppContext';

export const CreateComponent = () => {
  const { isSignedIn, setIsSignedIn, setAdmin } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(
          'You either entered the wrong email or password or you are not an admin'
        );
        return;
      }
      setIsSignedIn(true);
      setAdmin(data.user);
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  if (!isClient) {
    // TODO: Add loading indicator
    return null;
  }

  return (
    <main className='flex min-h-screen flex-col items-center p-12'>
      {isSignedIn ? (
        <CreateGame />
      ) : (
        <Column className='w-full gap-8'>
          <p className='text-2xl font-bold'>Sign in to create a Twizzin game</p>
          <Row className='w-full gap-4'>
            <Input
              className='flex-grow'
              type='email'
              id='email'
              name='email'
              placeholder='Enter your email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label='Email'
              required
            />
            <Input
              className='flex-grow'
              type='password'
              id='password'
              name='password'
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label='Password'
              required
            />
          </Row>
          <Column className='w-1/2'>
            <Button onClick={handleSignIn}>Sign in</Button>
          </Column>
        </Column>
      )}
    </main>
  );
};
