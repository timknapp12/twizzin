'use client';
import { useState } from 'react';
import { Column, ScreenContainer } from '../containers';
import { Input } from '../inputs';
import { Button } from '../Button';
import { supabase } from '../../utils/supabaseClient';

export const CreateComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <ScreenContainer>
      <Column className='w-full gap-4'>
        <p className='text-2xl font-bold'>Sign in to create a Twizzin game</p>
        <Input
          placeholder='Enter your email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder='Enter your password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Column className='w-1/2'>
          <Button onClick={handleSignUp}>Sign in</Button>
        </Column>
      </Column>
    </ScreenContainer>
  );
};
