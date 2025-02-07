import styles from '../styles/Home.module.css';
import { WalletConnectButton } from '../components/wallet-connect-button';
import { UserCard } from '../components/user-card';
import { getDehydratedStateFromSession } from '../common/session-helpers';

import type { NextPage, GetServerSidePropsContext } from 'next';

import { useState, useEffect, SetStateAction, useCallback } from 'react';
import * as MicroStacks from '@micro-stacks/react';
import { stringUtf8CV, standardPrincipalCV } from 'micro-stacks/clarity';
import {
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  callReadOnlyFunction,
} from 'micro-stacks/transactions';
import { useOpenContractCall } from '@micro-stacks/react';
import { useAuth } from '@micro-stacks/react';
import { StacksMocknet } from 'micro-stacks/network';
import useInterval from '@use-it/interval';

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return {
    props: {
      dehydratedState: await getDehydratedStateFromSession(ctx),
    },
  };
}

const Home: NextPage = () => {
  const { openContractCall, isRequestPending } = useOpenContractCall();
  const { stxAddress } = MicroStacks.useAccount();
  const [response, setResponse] = useState(null);
  const { openAuthRequest, signOut, isSignedIn } = useAuth();
  const [post, setPost] = useState('');
  const [postedMessage, setPostedMessage] = useState('none');
  const [contractAddress, setContractAddress] = useState(
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
  );

  //user input handler
  const handleMessageChange = (e: { target: { value: SetStateAction<string> } }) => {
    setPost(e.target.value);
  };

  //handle contract call to write-post
  const handleOpenContractCall = async () => {
    const functionArgs = [stringUtf8CV(post)];

    const postConditions = [
      makeStandardSTXPostCondition(stxAddress!, FungibleConditionCode.LessEqual, '1000000'),
    ];

    await openContractCall({
      contractAddress: contractAddress,
      contractName: 'blockpost',
      functionName: 'write-post',
      functionArgs,
      postConditions,
      attachment: 'This is an attachment',
      onFinish: async data => {
        console.log('finished contract call!', data);
        setResponse(data);
      },
      onCancel: () => {
        console.log('popup closed');
      },
    });
  };

  //handle contract call to get-post
  const getPost = useCallback(async () => {
    if (isSignedIn) {
      //args for function being called
      const functionArgs = [standardPrincipalCV(`${stxAddress}`)];

      //network param for callReadOnly
      const network = new StacksMocknet();

      //read only function call
      const result = await callReadOnlyFunction({
        contractAddress: contractAddress,
        contractName: 'blockpost',
        functionName: 'get-post',
        functionArgs,
        network,
      });
      console.log('getting result', result);
      if (result.value) {
        setPostedMessage(result.value.data);
      }
    }
  }, []);

  //run get post on signin to get message
  useEffect(() => {
    console.log('In useEffect');
    getPost();
  }, [isSignedIn]);

  //check the stacks API every 10 seconds looking for changes
  useInterval(getPost, 10000);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Next.js!</a>
        </h1>
        <UserCard />
        <WalletConnectButton />
      </main>
    </div>
  );
};

export default Home;
