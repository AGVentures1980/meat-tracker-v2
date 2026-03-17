const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Mock dependencies
jest = { mock: () => {} };
process.env.NODE_ENV = 'test';

require('@babel/register')({
  presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }], '@babel/preset-typescript'],
  extensions: ['.ts', '.tsx', '.js', '.jsx']
});

const { DealDeskModal } = require('./src/components/SaaS/DealDeskModal.tsx');

const AuthContextMock = require('react').createContext({ user: { token: 'mock' } });
jest.mock('./src/context/AuthContext', () => ({ useAuth: () => ({ user: { token: 'mock' } }) }));

try {
  const html = ReactDOMServer.renderToString(React.createElement(DealDeskModal, { isOpen: true, onClose: () => {} }));
  console.log("Render successful. Output length:", html.length);
} catch (e) {
  console.error("CRASH:", e);
}
