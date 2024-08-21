import {
  ScreenContainer,
  H1,
  H1Brand,
  TwizzinLogo,
  GradientContainer,
  Row,
} from '@/components';

export default function Home() {
  return (
    <ScreenContainer>
      <GradientContainer className='w-full md:w-1/2'>
        <TwizzinLogo />
        <Row>
          <H1 className='font-mono'>You be</H1>
          <H1Brand className='mr-2 ml-2 mt-2'>TWIZZIN</H1Brand>
          <H1 className='font-mono'>in:</H1>
        </Row>
      </GradientContainer>
    </ScreenContainer>
  );
}
