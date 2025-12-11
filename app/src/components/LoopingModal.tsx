import { FC, useState, useEffect } from 'react';

type LoopingState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

interface LoopingModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetSymbol: string;
    assetPrice: number;
    walletBalance: number;
}

export const LoopingModal: FC<LoopingModalProps> = ({ isOpen, onClose, assetSymbol, assetPrice, walletBalance }) => {
    const [leverage, setLeverage] = useState(1.5);
    const [amount, setAmount] = useState(0);
    const [modalState, setModalState] = useState<LoopingState>('IDLE');
    const [progressStep, setProgressStep] = useState(0);

    const steps = [
        "Initializing Flash Loan...",
        "Swapping Collateral...",
        "Borrowing Assets...",
        "Repaying Flash Loan...",
        "Verifying Position..."
    ];


    useEffect(() => {
        if (isOpen) {
            setModalState('IDLE');
            setProgressStep(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const totalExposure = amount * leverage;
    const borrowAmount = totalExposure - amount;
    

    const supplyApy = 5.0;
    const borrowApy = 6.0;
    const netApy = (totalExposure * supplyApy - borrowAmount * borrowApy) / amount;

    const handleLoop = async () => {
        setModalState('LOADING');
        

        for (let i = 0; i < steps.length; i++) {
            setProgressStep(i);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        setModalState('SUCCESS');
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#1b1b1f] border border-gray-700 rounded-2xl p-8 w-full max-w-md text-white font-sans shadow-2xl relative overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                        {modalState === 'IDLE' && `Loop ${assetSymbol}`}
                        {modalState === 'LOADING' && 'Processing Loop'}
                        {modalState === 'SUCCESS' && 'Loop Successful'}
                    </h2>
                    {modalState !== 'LOADING' && (
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Content based on State */}
                {modalState === 'IDLE' && (
                    <div className="animate-fade-in">
                        <div className="mb-6">
                            <label className="text-sm text-gray-400 mb-2 block">Deposit Amount</label>
                            <div className="flex items-center bg-[#27272a] rounded-xl px-4 py-3 border border-gray-600 focus-within:border-blue-500 transition-colors">
                                <input 
                                    type="number" 
                                    value={amount} 
                                    onChange={(e) => setAmount(Number(e.target.value))} 
                                    className="bg-transparent outline-none w-full text-2xl font-medium placeholder-gray-600"
                                    placeholder="0.00" 
                                    autoFocus
                                />
                                <span className="ml-2 font-bold text-gray-300">{assetSymbol}</span>
                            </div>
                            <div className="text-right text-xs text-gray-500 mt-2">Available: {walletBalance.toFixed(4)} {assetSymbol}</div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm text-gray-400">Target Leverage</label>
                                <span className="text-blue-400 font-bold">{leverage.toFixed(1)}x</span>
                            </div>
                            <input 
                                type="range" 
                                min="1.1" 
                                max="3.0" 
                                step="0.1" 
                                value={leverage} 
                                onChange={(e) => setLeverage(Number(e.target.value))} 
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                                <span>1.1x</span>
                                <span>2.0x</span>
                                <span>3.0x</span>
                            </div>
                        </div>

                        <div className="bg-[#27272a]/50 rounded-xl p-4 mb-8 space-y-3 text-sm border border-gray-700/50">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Exposure</span>
                                <span className="font-medium">{totalExposure.toFixed(4)} {assetSymbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Net APY</span>
                                <span className="text-green-400 font-bold">+{isNaN(netApy) ? '0.00' : netApy.toFixed(2)}%</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleLoop}
                            disabled={amount <= 0 || amount > walletBalance}
                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform active:scale-[0.98] ${
                                amount > 0 && amount <= walletBalance
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Confirm Loop
                        </button>
                    </div>
                )}

                {modalState === 'LOADING' && (
                    <div className="py-8 flex flex-col items-center animate-fade-in">
                        <div className="relative w-24 h-24 mb-8">
                            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                🔁
                            </div>
                        </div>
                        <div className="w-full space-y-3">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-center space-x-3 text-sm transition-all duration-300">
                                    <div className={`
                                        w-2 h-2 rounded-full transition-colors duration-300
                                        ${index === progressStep ? 'bg-blue-500 animate-pulse' : 
                                          index < progressStep ? 'bg-green-500' : 'bg-gray-700'}
                                    `} />
                                    <span className={`
                                        transition-colors duration-300
                                        ${index === progressStep ? 'text-white font-medium' : 
                                          index < progressStep ? 'text-gray-400' : 'text-gray-600'}
                                    `}>
                                        {step}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {modalState === 'SUCCESS' && (
                    <div className="py-4 flex flex-col items-center animate-fade-in">
                         <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                        <p className="text-gray-400 text-center mb-8">
                            You successfully looped {amount} {assetSymbol} to {leverage}x leverage.
                        </p>
                        
                        <div className="w-full bg-[#27272a] rounded-xl p-4 mb-6 border border-gray-700">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400 text-sm">New Position Size</span>
                                <span className="text-white font-medium">{totalExposure.toFixed(4)} {assetSymbol}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Health Ratio</span>
                                <span className="text-green-400 font-bold">1.25</span> 
                            </div>
                        </div>

                        <button 
                            onClick={handleClose}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-xl transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
