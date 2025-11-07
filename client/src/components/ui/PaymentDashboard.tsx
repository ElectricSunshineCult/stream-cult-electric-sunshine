/**
 * Stream Cult - Enhanced Payment Dashboard Component
 * Copyright (C) 2025 Corey Setzer (Unknown Artist) / Electric Sunshine Cult
 * 
 * This proprietary payment dashboard includes revenue sharing visualization,
 * token payouts, and comprehensive payment management developed exclusively
 * for the Stream Cult platform.
 * 
 * Unauthorized use, copying, modification, or distribution is strictly prohibited
 * without written permission from Electric Sunshine Cult.
 * 
 * Contact: info@electricsunshinecult.com
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  PiggyBank,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentData {
  tokenPackages: any[];
  exchangeRates: {
    buy_rate: number;
    sell_rate: number;
    last_updated: string;
  };
  userBalance: number;
  subscription?: {
    tier: string;
    bonus_percentage: number;
  };
}

interface PayoutRequest {
  amount_tokens: number;
  payout_method: string;
  payout_details: any;
}

const PaymentDashboard: React.FC = () => {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('paypal');
  const [payoutDetails, setPayoutDetails] = useState({
    email: '',
    address: '',
    account_number: '',
    routing_number: '',
    crypto_address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    fetchPaymentData();
    fetchPayoutHistory();
    fetchPaymentMethods();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const response = await fetch('/api/payments/token-packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPaymentData(data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      const response = await fetch('/api/payments/payout-history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPayoutHistory(data.payouts);
    } catch (error) {
      console.error('Error fetching payout history:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/payment-methods', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPaymentMethods(data.methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const requestPayout = async () => {
    if (!payoutAmount || parseInt(payoutAmount) < 100) {
      toast.error('Minimum payout is 100 tokens');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount_tokens: parseInt(payoutAmount),
          payout_method: payoutMethod,
          payout_details: payoutDetails
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Payout request submitted successfully');
        setPayoutAmount('');
        fetchPayoutHistory();
      } else {
        toast.error(data.error || 'Failed to submit payout request');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to submit payout request');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTokens = (tokens: number) => {
    return new Intl.NumberFormat().format(tokens);
  };

  const getPayoutStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!paymentData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Dashboard</h1>
          <p className="text-gray-600">Manage tokens, payouts, and revenue</p>
        </div>
        <div className="flex items-center space-x-2">
          <Wallet className="h-5 w-5 text-purple-600" />
          <span className="text-lg font-semibold">
            {formatTokens(paymentData.userBalance)} Tokens
          </span>
        </div>
      </div>

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="packages">Token Packages</TabsTrigger>
          <TabsTrigger value="payout">Request Payout</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        {/* Token Packages */}
        <TabsContent value="packages" className="space-y-6">
          {/* Exchange Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Exchange Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Buy Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    1 USD = {paymentData.exchangeRates.buy_rate} tokens
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Sell Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(1 / paymentData.exchangeRates.sell_rate)} tokens = 1 USD
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(paymentData.exchangeRates.last_updated).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* Token Packages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paymentData.tokenPackages.map((pkg) => (
              <Card key={pkg.id} className={pkg.popular ? 'ring-2 ring-purple-500' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{pkg.name}</CardTitle>
                    {pkg.popular && (
                      <Badge variant="default" className="bg-purple-600">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {formatTokens(pkg.tokens)} tokens + {formatTokens(pkg.bonus)} bonus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {formatCurrency(pkg.price)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ${pkg.effective_rate}/token
                      </p>
                    </div>
                    
                    {paymentData.subscription && (
                      <Alert>
                        <PiggyBank className="h-4 w-4" />
                        <AlertDescription>
                          {paymentData.subscription.tier} member: {paymentData.subscription.bonus_percentage}% bonus
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button className="w-full" size="lg">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Request Payout */}
        <TabsContent value="payout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Request Token Payout
              </CardTitle>
              <CardDescription>
                Convert your tokens to real money and cash out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Minimum payout: $10.00 USD (250 tokens). Processing time varies by method.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payout-amount">Token Amount</Label>
                    <Input
                      id="payout-amount"
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="Enter token amount (min 250)"
                      min="100"
                    />
                    {payoutAmount && (
                      <p className="text-sm text-gray-600 mt-1">
                        ≈ {formatCurrency(parseInt(payoutAmount) * paymentData.exchangeRates.sell)} USD
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="payout-method">Payout Method</Label>
                    <select
                      id="payout-method"
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="paypal">PayPal (1-3 business days)</option>
                      <option value="bank_transfer">Bank Transfer (3-7 business days)</option>
                      <option value="crypto">Cryptocurrency (1-2 business days)</option>
                      <option value="check">Check (7-21 business days)</option>
                    </select>
                    
                    {/* Processing time information */}
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <div className="flex items-start space-x-2">
                        <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Processing Time: {
                              payoutMethod === 'paypal' ? '1-3 business days' :
                              payoutMethod === 'bank_transfer' ? '3-7 business days' :
                              payoutMethod === 'crypto' ? '1-2 business days' :
                              '7-21 business days'
                            }
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {
                              payoutMethod === 'paypal' ? 'May take longer during peak periods or for first-time users' :
                              payoutMethod === 'bank_transfer' ? 'International transfers may take up to 10 business days' :
                              payoutMethod === 'crypto' ? 'Network confirmation time may vary during high traffic' :
                              'Includes mailing time. International checks may take longer.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Payout Details</h3>
                  
                  {payoutMethod === 'paypal' && (
                    <div>
                      <Label htmlFor="paypal-email">PayPal Email</Label>
                      <Input
                        id="paypal-email"
                        type="email"
                        value={payoutDetails.email}
                        onChange={(e) => setPayoutDetails({...payoutDetails, email: e.target.value})}
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  {payoutMethod === 'bank_transfer' && (
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="bank-address">Bank Address</Label>
                        <Input
                          id="bank-address"
                          value={payoutDetails.address}
                          onChange={(e) => setPayoutDetails({...payoutDetails, address: e.target.value})}
                          placeholder="Bank name and address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          value={payoutDetails.account_number}
                          onChange={(e) => setPayoutDetails({...payoutDetails, account_number: e.target.value})}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="routing-number">Routing Number</Label>
                        <Input
                          id="routing-number"
                          value={payoutDetails.routing_number}
                          onChange={(e) => setPayoutDetails({...payoutDetails, routing_number: e.target.value})}
                          placeholder="Routing number"
                        />
                      </div>
                    </div>
                  )}

                  {payoutMethod === 'crypto' && (
                    <div>
                      <Label htmlFor="crypto-address">Wallet Address</Label>
                      <Input
                        id="crypto-address"
                        value={payoutDetails.crypto_address}
                        onChange={(e) => setPayoutDetails({...payoutDetails, crypto_address: e.target.value})}
                        placeholder="Your wallet address"
                      />
                    </div>
                  )}

                  {payoutMethod === 'check' && (
                    <div>
                      <Label htmlFor="check-address">Mailing Address</Label>
                      <Input
                        id="check-address"
                        value={payoutDetails.address}
                        onChange={(e) => setPayoutDetails({...payoutDetails, address: e.target.value})}
                        placeholder="Where to mail the check"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={requestPayout} 
                disabled={isLoading || !payoutAmount}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Request Payout
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="h-5 w-5 mr-2" />
                Payout History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payoutHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payout requests found</p>
              ) : (
                <div className="space-y-4">
                  {payoutHistory.map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getPayoutStatusIcon(payout.status)}
                        <div>
                          <p className="font-semibold">
                            {formatTokens(payout.amount_tokens)} tokens
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(payout.net_amount)} net amount
                          </p>
                          <p className="text-xs text-gray-500">
                            Requested: {new Date(payout.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getPayoutStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                        {payout.admin_notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            {payout.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods */}
        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your payout payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payment methods saved</p>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method: any) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{method.method_name}</p>
                        <p className="text-sm text-gray-600">
                          {method.method_type.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {method.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                        {method.is_verified && (
                          <Badge className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentDashboard;