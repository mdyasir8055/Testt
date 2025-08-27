import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, X, Eye, Settings } from 'lucide-react';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'privacy' | 'financial' | 'healthcare' | 'legal' | 'general';
  enabled: boolean;
}

interface ComplianceViolation {
  ruleId: string;
  ruleName: string;
  severity: string;
  location: string;
  content: string;
  suggestion: string;
}

interface ComplianceFilterProps {
  documentId?: string;
  content?: string;
  onFilteredContent: (filteredContent: string, violations: ComplianceViolation[]) => void;
}

export function ComplianceFilter({ documentId, content, onFilteredContent }: ComplianceFilterProps) {
  const [selectedStandard, setSelectedStandard] = useState<string>('gdpr');
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoFilter, setAutoFilter] = useState(false);

  const complianceStandards = [
    { id: 'gdpr', name: 'GDPR', description: 'General Data Protection Regulation' },
    { id: 'hipaa', name: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
    { id: 'sox', name: 'SOX', description: 'Sarbanes-Oxley Act' },
    { id: 'pci', name: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
    { id: 'ferpa', name: 'FERPA', description: 'Family Educational Rights and Privacy Act' },
    { id: 'custom', name: 'Custom', description: 'Custom compliance rules' }
  ];

  const defaultRules: Record<string, ComplianceRule[]> = {
    gdpr: [
      {
        id: 'gdpr-personal-data',
        name: 'Personal Data Detection',
        description: 'Identifies and flags personal data elements',
        severity: 'high',
        category: 'privacy',
        enabled: true
      },
      {
        id: 'gdpr-consent',
        name: 'Consent Requirements',
        description: 'Ensures data processing has proper consent',
        severity: 'critical',
        category: 'privacy',
        enabled: true
      },
      {
        id: 'gdpr-data-minimization',
        name: 'Data Minimization',
        description: 'Checks for excessive data collection',
        severity: 'medium',
        category: 'privacy',
        enabled: true
      }
    ],
    hipaa: [
      {
        id: 'hipaa-phi',
        name: 'Protected Health Information',
        description: 'Detects PHI in healthcare documents',
        severity: 'critical',
        category: 'healthcare',
        enabled: true
      },
      {
        id: 'hipaa-safeguards',
        name: 'Administrative Safeguards',
        description: 'Ensures proper administrative controls',
        severity: 'high',
        category: 'healthcare',
        enabled: true
      }
    ],
    sox: [
      {
        id: 'sox-financial-data',
        name: 'Financial Data Controls',
        description: 'Validates financial reporting controls',
        severity: 'critical',
        category: 'financial',
        enabled: true
      },
      {
        id: 'sox-audit-trail',
        name: 'Audit Trail Requirements',
        description: 'Ensures proper audit documentation',
        severity: 'high',
        category: 'financial',
        enabled: true
      }
    ]
  };

  useEffect(() => {
    if (selectedStandard && defaultRules[selectedStandard]) {
      setRules(defaultRules[selectedStandard]);
    }
  }, [selectedStandard]);

  const runComplianceScan = async () => {
    if (!content) return;

    setIsScanning(true);
    setScanProgress(0);
    setViolations([]);

    try {
      // Simulate compliance scanning
      const enabledRules = rules.filter(rule => rule.enabled);
      const foundViolations: ComplianceViolation[] = [];

      for (let i = 0; i < enabledRules.length; i++) {
        setScanProgress(((i + 1) / enabledRules.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500));

        const rule = enabledRules[i];
        
        // Simulate finding violations based on rule type
        if (rule.id.includes('personal-data') || rule.id.includes('phi')) {
          foundViolations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            location: 'Page 2, Section 3.1',
            content: 'John Doe, SSN: 123-45-6789, DOB: 01/15/1985',
            suggestion: 'Replace with anonymized identifiers or remove sensitive data'
          });
        }

        if (rule.id.includes('financial-data')) {
          foundViolations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            location: 'Page 5, Financial Summary',
            content: 'Account Number: 4532-1234-5678-9012',
            suggestion: 'Mask account numbers or use secure references'
          });
        }

        if (rule.id.includes('consent')) {
          foundViolations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            location: 'Page 1, Data Collection',
            content: 'Data collected without explicit consent documentation',
            suggestion: 'Add consent forms and legal basis documentation'
          });
        }
      }

      setViolations(foundViolations);

      // Apply auto-filtering if enabled
      let filteredContent = content;
      if (autoFilter && foundViolations.length > 0) {
        filteredContent = applyAutoFilter(content, foundViolations);
      }

      onFilteredContent(filteredContent, foundViolations);

    } finally {
      setIsScanning(false);
    }
  };

  const applyAutoFilter = (originalContent: string, violations: ComplianceViolation[]): string => {
    let filtered = originalContent;
    
    violations.forEach(violation => {
      if (violation.content.includes('SSN:')) {
        filtered = filtered.replace(/SSN:\s*\d{3}-\d{2}-\d{4}/g, 'SSN: [REDACTED]');
      }
      if (violation.content.includes('Account Number:')) {
        filtered = filtered.replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, '[REDACTED-ACCOUNT]');
      }
    });
    
    return filtered;
  };

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getViolationStats = () => {
    const stats = violations.reduce((acc, violation) => {
      acc[violation.severity] = (acc[violation.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regulatory Compliance & Content Filtering
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedStandard} onValueChange={setSelectedStandard}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select standard" />
              </SelectTrigger>
              <SelectContent>
                {complianceStandards.map((standard) => (
                  <SelectItem key={standard.id} value={standard.id}>
                    {standard.name} - {standard.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Rules Configuration</TabsTrigger>
            <TabsTrigger value="scan">Compliance Scan</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Compliance Rules</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm">Auto-filter violations</label>
                <Switch checked={autoFilter} onCheckedChange={setAutoFilter} />
              </div>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className={rule.enabled ? 'border-primary/20' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <span className="font-medium text-sm">{rule.name}</span>
                          <Badge variant={getSeverityColor(rule.severity) as any}>
                            {rule.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <div className="text-center space-y-4">
              {!isScanning && violations.length === 0 && (
                <>
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Run a compliance scan to check for violations</p>
                  <Button 
                    onClick={runComplianceScan} 
                    disabled={!content || rules.filter(r => r.enabled).length === 0}
                    data-testid="button-run-scan"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Run Compliance Scan
                  </Button>
                </>
              )}

              {isScanning && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 justify-center">
                    <Shield className="h-4 w-4 animate-pulse" />
                    <span>Scanning for compliance violations...</span>
                  </div>
                  <Progress value={scanProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Checking {rules.filter(r => r.enabled).length} compliance rules
                  </p>
                </div>
              )}

              {!isScanning && violations.length > 0 && (
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {violations.length} compliance violations that require attention.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(getViolationStats()).map(([severity, count]) => (
                      <Card key={severity}>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground capitalize">{severity}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Button onClick={runComplianceScan} variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Rescan
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            {violations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No compliance violations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {violations.map((violation, index) => (
                  <Card key={index} className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-sm">{violation.ruleName}</span>
                          <Badge variant={getSeverityColor(violation.severity) as any}>
                            {violation.severity}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{violation.location}</span>
                      </div>
                      
                      <div className="bg-muted p-3 rounded text-xs mb-2">
                        <strong>Violation:</strong> {violation.content}
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded text-xs">
                        <strong>Suggestion:</strong> {violation.suggestion}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}