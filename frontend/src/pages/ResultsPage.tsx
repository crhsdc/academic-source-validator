import React from 'react';
import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function ResultsPage() {
  const { sessionId } = useParams();

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Validation Results
      </Typography>
      <Typography>Session ID: {sessionId}</Typography>
      <Typography color="text.secondary">
        Results display coming soon...
      </Typography>
    </Container>
  );
}
