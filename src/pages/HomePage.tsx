import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HomePageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #d4d4d4;
  margin-bottom: 2rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const CreateRoomButton = styled.button`
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #1177bb;
  }
`;

const JoinRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
`;

const RoomIdInput = styled.input`
  padding: 0.8rem;
  font-size: 1rem;
  width: 300px;
  margin-bottom: 1rem;
  background-color: #3c3c3c;
  border: 1px solid #555;
  color: #d4d4d4;
`;

const JoinRoomButton = styled.button`
  background-color: #5c5c5c;
  color: #ffffff;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #6a6a6a;
  }
`;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const createRoom = async () => {
    try {
        const response = await fetch('http://localhost:8000/rooms', {
            method: 'POST'
        });
        const data = await response.json();
        navigate(`/room/${data.roomId}`);
    } catch (error) {
        console.error('Error creating room:', error);
    }
  };

  const joinRoom = () => {
    if (roomId.trim() !== '') {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <HomePageContainer>
      <Title>Real-Time Collaborative Code Editor</Title>
      <ButtonContainer>
        <CreateRoomButton onClick={createRoom}>Create New Room</CreateRoomButton>
      </ButtonContainer>
      <JoinRoomContainer>
        <RoomIdInput 
          type="text" 
          placeholder="Enter Room ID" 
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <JoinRoomButton onClick={joinRoom}>Join Room</JoinRoomButton>
      </JoinRoomContainer>
    </HomePageContainer>
  );
};

export default HomePage;
