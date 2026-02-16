import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';

export default function HomePage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const parseResponse = await apiClient.post(API_ENDPOINTS.PARSE, { text });
      const { sessionId, sources } = parseResponse.data;

      // Validate sources
      const validateResponse = await apiClient.post(API_ENDPOINTS.VALIDATE, {
        sessionId,
        sources,
      });

      // Navigate with results in state
      navigate(`/results/${sessionId}`, {
        state: {
          sources,
          results: validateResponse.data.results,
        },
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing sources');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Source Validator
        </Typography>
        <Typography variant="h6" gutterBottom align="center" color="text.secondary">
          Validate academic citations and sources
        </Typography>

        <Paper sx={{ p: 3, mt: 4 }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Paste your bibliography here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Smith, J. (2020). Sample article. Journal Name, 10(2), 123-145."
            disabled={loading}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? 'Processing...' : 'Validate Sources'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
