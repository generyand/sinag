import Link from "next/link";

export default function AssessmentsPage() {
  // Mock data - replace with actual API call
  const assessments = [
    {
      id: "1",
      title: "Q1 2024 Leadership Assessment",
      status: "completed",
      completedDate: "2024-03-15",
      score: 85,
    },
    {
      id: "2",
      title: "Team Dynamics Evaluation",
      status: "in-progress",
      completedDate: null,
      score: null,
    },
    {
      id: "3",
      title: "Strategic Planning Assessment",
      status: "pending",
      completedDate: null,
      score: null,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Completed
          </span>
        );
      case "in-progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            In Progress
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SGLGB Assessments</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track your leadership assessments</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Assessment
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {assessments.map((assessment) => (
            <li key={assessment.id}>
              <Link
                href={`/assessments/${assessment.id}`}
                className="block hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{assessment.title}</div>
                      <div className="text-sm text-gray-500">
                        {assessment.completedDate
                          ? `Completed on ${new Date(assessment.completedDate).toLocaleDateString()}`
                          : "Not completed"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {assessment.score && (
                      <div className="text-sm text-gray-900">
                        Compliance Rate: <span className="font-medium">{assessment.score}%</span>
                      </div>
                    )}
                    {getStatusBadge(assessment.status)}
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
