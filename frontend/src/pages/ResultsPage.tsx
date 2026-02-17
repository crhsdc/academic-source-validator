import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import apiClient from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';

interface Source {
  id: string;
  citation: string;
  type: string;
  author?: string;
  year?: number;
  title?: string;
  url?: string;
}

interface ValidationResult {
  sourceId: string;
  isValid: boolean;
  score: number;
  checks: {
    urlAccessible: boolean | null;
    formatCorrect: boolean;
    credibleDomain: boolean | null;
    isRecent: boolean | null;
    hasRequiredFields: boolean;
  };
  issues: string[];
  warnings: string[];
}

interface LocationState {
  sources: Source[];
  results: ValidationResult[];
}

interface AIAnalysis {
  sourceId: string;
  analysis: string;
  suggestions: string[];
  completeness: number;
  aiConfidence: number;
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!state || !state.sources || !state.results) {
    return (
      <Container>
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">
            No results found. Please go back and validate your sources.
          </Alert>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    );
  }

  const { sources, results } = state;

  const handleGetAISuggestions = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const response = await apiClient.post(API_ENDPOINTS.ANALYZE, {
        sources,
      });
      setAiAnalyses(response.data.analyses);
    } catch (error: any) {
      console.error('AI analysis error:', error);
      setAiError('Failed to get AI suggestions. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircleIcon color="success" />
    ) : (
      <ErrorIcon color="error" />
    );
  };

  const averageScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Validation Results
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Session ID: {sessionId}
        </Typography>

        {/* Summary Card */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Typography variant="h6" gutterBottom>
                Total Sources
              </Typography>
              <Typography variant="h3">{sources.length}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h6" gutterBottom>
                Valid Sources
              </Typography>
              <Typography variant="h3" color="success.main">
                {results.filter((r) => r.isValid).length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="h6" gutterBottom>
                Average Score
              </Typography>
              <Typography variant="h3" color={`${getScoreColor(averageScore)}.main`}>
                {averageScore}%
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Individual Results */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Individual Source Validation
        </Typography>

        {sources.map((source, index) => {
          const result = results.find((r) => r.sourceId === source.id);
          if (!result) return null;

          return (
            <Card key={source.id} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ mr: 2 }}>{getStatusIcon(result.isValid)}</Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Source #{index + 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {source.citation}
                    </Typography>

                    {/* Source Details */}
                    <Box sx={{ mb: 2 }}>
                      <Chip label={source.type} size="small" sx={{ mr: 1 }} />
                      {source.author && (
                        <Chip
                          label={`Author: ${source.author}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                      {source.year && (
                        <Chip
                          label={`Year: ${source.year}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                    </Box>

                    {/* Validation Score */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Validation Score: {result.score}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={result.score}
                        color={getScoreColor(result.score)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    {/* Validation Checks */}
                    <Typography variant="subtitle2" gutterBottom>
                      Validation Checks:
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          icon={
                            result.checks.formatCorrect ? (
                              <CheckCircleIcon />
                            ) : (
                              <ErrorIcon />
                            )
                          }
                          label="Format Correct"
                          color={result.checks.formatCorrect ? 'success' : 'error'}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Chip
                          icon={
                            result.checks.hasRequiredFields ? (
                              <CheckCircleIcon />
                            ) : (
                              <ErrorIcon />
                            )
                          }
                          label="Has Required Fields"
                          color={result.checks.hasRequiredFields ? 'success' : 'error'}
                          variant="outlined"
                          size="small"
                        />
                      </Grid>
                      {result.checks.urlAccessible !== null && (
                        <Grid item xs={12} sm={6}>
                          <Chip
                            icon={
                              result.checks.urlAccessible ? (
                                <CheckCircleIcon />
                              ) : (
                                <ErrorIcon />
                              )
                            }
                            label="URL Accessible"
                            color={result.checks.urlAccessible ? 'success' : 'error'}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                      )}
                      {result.checks.credibleDomain !== null && (
                        <Grid item xs={12} sm={6}>
                          <Chip
                            icon={
                              result.checks.credibleDomain ? (
                                <CheckCircleIcon />
                              ) : (
                                <WarningIcon />
                              )
                            }
                            label="Credible Domain"
                            color={result.checks.credibleDomain ? 'success' : 'warning'}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                      )}
                      {result.checks.isRecent !== null && (
                        <Grid item xs={12} sm={6}>
                          <Chip
                            icon={
                              result.checks.isRecent ? (
                                <CheckCircleIcon />
                              ) : (
                                <WarningIcon />
                              )
                            }
                            label="Recent (< 10 years)"
                            color={result.checks.isRecent ? 'success' : 'warning'}
                            variant="outlined"
                            size="small"
                          />
                        </Grid>
                      )}
                    </Grid>

                    {/* Issues */}
                    {result.issues && result.issues.length > 0 && (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Issues:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {result.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}

                    {/* Warnings */}
                    {result.warnings && result.warnings.length > 0 && (
                      <Alert severity="warning">
                        <Typography variant="subtitle2" gutterBottom>
                          Warnings:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {result.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </Alert>
                    )}

                    {/* AI Analysis */}
                    {aiAnalyses.length > 0 && (() => {
                      const aiAnalysis = aiAnalyses.find((a) => a.sourceId === source.id);
                      if (!aiAnalysis) return null;

                      return (
                        <Accordion sx={{ mt: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AutoAwesomeIcon color="secondary" fontSize="small" />
                              <Typography variant="subtitle2">
                                AI Analysis & Suggestions
                              </Typography>
                              <Chip
                                label={`${aiAnalysis.completeness}% Complete`}
                                size="small"
                                color={getScoreColor(aiAnalysis.completeness)}
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box>
                              <Typography variant="body2" paragraph>
                                {aiAnalysis.analysis}
                              </Typography>

                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                <LightbulbIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                Improvement Suggestions:
                              </Typography>
                              <List dense>
                                {aiAnalysis.suggestions.map((suggestion, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                      <Chip label={idx + 1} size="small" color="secondary" />
                                    </ListItemIcon>
                                    <ListItemText primary={suggestion} />
                                  </ListItem>
                                ))}
                              </List>

                              {aiAnalysis.aiConfidence > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  AI Confidence: {aiAnalysis.aiConfidence}%
                                </Typography>
                              )}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })()}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}

        {/* AI Analysis Section */}
        {!aiAnalyses.length && !loadingAI && (
          <Box sx={{ mt: 4, mb: 2 }}>
            <Alert severity="info" icon={<AutoAwesomeIcon />}>
              <Typography variant="body2">
                Want AI-powered suggestions to improve your citations?
              </Typography>
            </Alert>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleGetAISuggestions}
              sx={{ mt: 2 }}
              fullWidth
            >
              Get AI Suggestions (Powered by Claude 3.5 Sonnet)
            </Button>
          </Box>
        )}

        {loadingAI && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              AI is analyzing your citations...
            </Typography>
          </Box>
        )}

        {aiError && (
          <Alert severity="error" sx={{ mt: 4 }}>
            {aiError}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Validate More Sources
          </Button>
          <Button
            variant="contained"
            onClick={() => window.print()}
          >
            Print Results
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
