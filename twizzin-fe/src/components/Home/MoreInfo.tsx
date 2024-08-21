import { Button, Row, Column } from '@/components';
import { FaChevronUp } from 'react-icons/fa';

const MoreInfo = ({ toggleMoreInfo }: { toggleMoreInfo: () => void }) => (
  <Button onClick={toggleMoreInfo} className='w-full'>
    <Column className='items-start gap-2'>
      <Row className='w-full relative'>
        <span className='flex-grow mr-6 ml-6'>Gimme less info</span>
        <FaChevronUp
          size={18}
          className='absolute top-2 right-0 hidden sm:block'
        />
      </Row>
      <p className='text-sm'>
        This is a lot of data and explanation about the app. This is a lot of
        data and explanation about the app. This is a lot of data and
        explanation about the app. This is a lot of data and explanation about
        the app. This is a lot of data and explanation about the app.
        explanation about the app. This is a lot of data and explanation about
        the app. This is a lot of data and explanation about the app.
        explanation about the app. This is a lot of data and explanation about
        the app. This is a lot of data and explanation about the app.
      </p>
    </Column>
  </Button>
);

export default MoreInfo;
