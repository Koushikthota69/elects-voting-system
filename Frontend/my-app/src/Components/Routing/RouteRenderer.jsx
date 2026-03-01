// src/Components/Routing/RouteRenderer.jsx
import React from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from '../Auth/ProtectedRoute';

const RouteRenderer = ({ routes, isProtected = false, isAdmin = false }) => {
  return routes.map((route) => {
    const routeElement = (
      <Route
        key={route.path}
        path={route.path}
        exact={route.exact}
        element={
          <route.component {...(route.props || {})} />
        }
      />
    );

    if (isProtected || isAdmin) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute isAdmin={isAdmin}>
              <route.component {...(route.props || {})} />
            </ProtectedRoute>
          }
        />
      );
    }

    return routeElement;
  });
};

export default RouteRenderer;